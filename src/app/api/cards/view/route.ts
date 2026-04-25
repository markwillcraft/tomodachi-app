import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { awardForCardView } from "@/lib/coins";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  maybeNotifyCardsMilestone,
  notifyQuestCompleted,
  type NotificationRow,
} from "@/lib/notify";
import { getUserTimezone, localDayKey } from "@/lib/time";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // High-volume — every card flip on the vocab study page hits this.
  // The generous `view` bucket lets a real user blow through cards
  // while still capping a script that wants to farm coin views.
  const limited = await enforceRateLimit("view", userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { wordId } = (body ?? {}) as { wordId?: number };
  if (typeof wordId !== "number") {
    return NextResponse.json({ error: "Missing wordId" }, { status: 400 });
  }

  // Make sure the word actually belongs to this user before logging a view
  // against it. Prevents anyone bumping their streak with someone else's
  // word ids.
  const word = await prisma.word.findFirst({
    where: { id: wordId, userId },
    select: { id: true },
  });
  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  const view = await prisma.cardView.create({ data: { userId, wordId } });
  const coins = await awardForCardView(userId, view.id);

  // Daily milestones (25 / 50 / 100 cards studied) feed the bell so
  // the user sees a "Vocab milestone" notification instead of just a
  // silent coin trickle. Only fires when this view actually awarded
  // (i.e. it crossed the count, not when the daily cap was hit). The
  // freshly created rows are echoed back as `newNotifications` so
  // `apiFetch` can pop the matching toasts on the client.
  let newNotifications: NotificationRow[] = [];
  if (coins.awardedAfter > coins.awardedBefore) {
    try {
      const tasks: Array<Promise<NotificationRow | null>> = [
        maybeNotifyCardsMilestone(userId, coins.awardedBefore),
      ];
      if (coins.claimedQuests.length > 0) {
        const tz = await getUserTimezone(userId);
        const day = localDayKey(new Date(), tz);
        for (const q of coins.claimedQuests) {
          tasks.push(
            notifyQuestCompleted(userId, day, {
              questId: q.id,
              title: q.title,
              reward: q.reward,
            }),
          );
        }
      }
      const results = await Promise.all(tasks);
      newNotifications = results.filter(
        (r): r is NotificationRow => r !== null,
      );
    } catch {
      // Non-blocking.
    }
  }

  return NextResponse.json({ ok: true, coins, newNotifications });
}
