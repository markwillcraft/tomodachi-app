import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { awardForKanaDrill } from "@/lib/coins";
import {
  notifyKanaDrillFinished,
  notifyQuestCompleted,
  type NotificationRow,
} from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getUserTimezone, localDayKey } from "@/lib/time";

export const runtime = "nodejs";

// POST /api/study/kana-drill  { drillKey, total, correct }
//
// Records the result of a completed kana muscle-memory session and
// returns the coin payout. The drillKey is a client-generated unique id
// (e.g. crypto.randomUUID()) used to dedup network retries — same key
// will not double-pay.
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("write", userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { drillKey, total, correct } = (body ?? {}) as {
    drillKey?: string;
    total?: number;
    correct?: number;
  };

  if (!drillKey || typeof drillKey !== "string") {
    return NextResponse.json({ error: "Missing drillKey" }, { status: 400 });
  }
  if (typeof total !== "number" || total <= 0) {
    return NextResponse.json({ error: "Invalid total" }, { status: 400 });
  }
  if (typeof correct !== "number" || correct < 0 || correct > total) {
    return NextResponse.json({ error: "Invalid correct count" }, { status: 400 });
  }

  const safeKey = drillKey.slice(0, 64);

  // Persist the session BEFORE awarding coins, so the
  // `kana_drill_session` daily quest (which counts rows in this table)
  // sees the new row when `awardForKanaDrill` re-runs the quest claim
  // pass. Idempotent: P2002 on the unique drillKey = same drill being
  // POSTed twice (e.g. retry), treat as success.
  try {
    await prisma.kanaDrillSession.create({
      data: { userId, drillKey: safeKey, total, correct },
    });
  } catch (err) {
    if (
      !(
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      )
    ) {
      throw err;
    }
  }

  const coins = await awardForKanaDrill(userId, safeKey, total, correct);

  // Self-study session ended → bell entry. Quest completions surface
  // separately so the user sees both the session and the reward in
  // the dropdown. All writes are idempotent so a network retry of
  // the kana-drill POST won't produce duplicate notifications. The
  // freshly created rows are echoed back as `newNotifications` so
  // `apiFetch` can pop the matching toasts on the client.
  let newNotifications: NotificationRow[] = [];
  try {
    const tz = await getUserTimezone(userId);
    const day = localDayKey(new Date(), tz);
    const tasks: Array<Promise<NotificationRow | null>> = [
      notifyKanaDrillFinished(userId, safeKey, {
        total,
        correct,
        coinsEarned: coins.earned,
      }),
    ];
    for (const q of coins.claimedQuests) {
      tasks.push(
        notifyQuestCompleted(userId, day, {
          questId: q.id,
          title: q.title,
          reward: q.reward,
        }),
      );
    }
    const results = await Promise.all(tasks);
    newNotifications = results.filter(
      (r): r is NotificationRow => r !== null,
    );
  } catch {
    // Non-blocking.
  }

  return NextResponse.json({ ok: true, coins, newNotifications });
}
