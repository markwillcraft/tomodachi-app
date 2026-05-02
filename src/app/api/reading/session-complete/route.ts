import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth-utils";
import { claimEligibleQuests } from "@/lib/coins";
import {
  notifyQuestCompleted,
  type NotificationRow,
} from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isReadingSet, isReadingStage } from "@/lib/reading";
import { getUserTimezone, localDayKey } from "@/lib/time";

export const runtime = "nodejs";

// POST /api/reading/session-complete
//   { sessionKey, stage, set, cardsShown, durationMs }
//
// Persists a finished kana Reading session and re-evaluates daily
// quests. Reading mode is otherwise local-only — this row is the
// only server-side trace of the session, so the daily quest
// (`kana_reading_session`) can ask "did you do one today?" without
// inferring from coin events.
//
// `sessionKey` is a client-generated UUID minted on session start.
// The matching @unique on ReadingSession makes a network retry or
// accidental double-POST a no-op — we treat the duplicate as success
// and still re-run `claimEligibleQuests` so the quest surfaces even
// when the server crashed mid-claim last time.
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

  const { sessionKey, stage, set, cardsShown, durationMs } = (body ?? {}) as {
    sessionKey?: unknown;
    stage?: unknown;
    set?: unknown;
    cardsShown?: unknown;
    durationMs?: unknown;
  };

  if (typeof sessionKey !== "string" || sessionKey.length === 0) {
    return NextResponse.json(
      { error: "Missing sessionKey" },
      { status: 400 },
    );
  }
  if (typeof stage !== "number" || !isReadingStage(stage)) {
    return NextResponse.json(
      { error: "stage must be 1, 2, 3, or 4" },
      { status: 400 },
    );
  }
  if (typeof set !== "number" || !isReadingSet(set)) {
    return NextResponse.json(
      { error: "set must be 1, 2, 3, 4, or 5" },
      { status: 400 },
    );
  }
  if (typeof cardsShown !== "number" || cardsShown <= 0 || cardsShown > 1000) {
    return NextResponse.json(
      { error: "Invalid cardsShown" },
      { status: 400 },
    );
  }
  if (
    typeof durationMs !== "number" ||
    !Number.isFinite(durationMs) ||
    durationMs < 0 ||
    durationMs > 24 * 3600_000
  ) {
    return NextResponse.json(
      { error: "Invalid durationMs" },
      { status: 400 },
    );
  }

  const safeKey = sessionKey.slice(0, 64);

  try {
    await prisma.readingSession.create({
      data: {
        userId,
        stage,
        set,
        sessionKey: safeKey,
        cardsShown: Math.floor(cardsShown),
        durationMs: Math.floor(durationMs),
      },
    });
  } catch (err) {
    // P2002 on the sessionKey unique = duplicate POST. Treat as success
    // (idempotent retry) and continue to the quest re-evaluation below
    // so a mid-flight crash on the previous attempt still gets the
    // quest claimed on this retry.
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

  const claimed = await claimEligibleQuests(userId);

  let newNotifications: NotificationRow[] = [];
  try {
    const tz = await getUserTimezone(userId);
    const day = localDayKey(new Date(), tz);
    const tasks = claimed.map((q) =>
      notifyQuestCompleted(userId, day, {
        questId: q.id,
        title: q.title,
        reward: q.reward,
      }),
    );
    const results = await Promise.all(tasks);
    newNotifications = results.filter(
      (r): r is NotificationRow => r !== null,
    );
  } catch {
    // Non-blocking — bell row is nice-to-have, the coin grant is the
    // important side effect and it's already done.
  }

  return NextResponse.json({
    ok: true,
    claimedQuests: claimed,
    newNotifications,
  });
}
