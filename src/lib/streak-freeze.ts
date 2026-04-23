import { prisma } from "./prisma";
import {
  DAILY_CARD_GOAL,
  DAILY_QUIZ_GOAL,
} from "./streak";
import {
  getUserPreferences,
  getUserTimezone,
  localDayKey,
  localMidnight,
  previousLocalDayKey,
} from "./time";

// =====================================================================
// Streak freeze / forgiveness
// ---------------------------------------------------------------------
// Users earn one "freeze" per ISO week, stored unclaimed in StreakFreeze
// (up to MAX_STORED_FREEZES at a time). When a prior local day fails the
// daily goal, reconcile() auto-consumes one freeze for that day so the
// streak walker in getStreak() treats it as completed.
//
// The grant is keyed on "weekly:<iso-year>-W<iso-week>:<tz>" so two
// grants in the same week collide on the unique index and the second
// one silently no-ops. Consumption is keyed on the local day key so we
// can never burn two freezes on the same day.
// =====================================================================

export const MAX_STORED_FREEZES = 2;

// Return the ISO-8601 week key (YYYY-Www) for the local calendar week
// that contains `date` in `tz`. ISO weeks start on Monday and week 1 of
// a year is the week containing the first Thursday of that year.
export function localWeekKey(date: Date, tz: string): string {
  const dayKey = localDayKey(date, tz);
  const [y, m, d] = dayKey.split("-").map(Number);
  // Build a UTC date at noon to sidestep any timezone math inside the
  // ISO-week calc. We already captured the local calendar day above;
  // from here it's pure ISO arithmetic.
  const target = new Date(Date.UTC(y, m - 1, d, 12));
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3); // move to Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600_000),
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type FreezeInventory = {
  available: number;
  frozenDays: Set<string>;
};

export async function getFreezeInventory(
  userId: string,
  sinceDayKey?: string,
): Promise<FreezeInventory> {
  const rows = await prisma.streakFreeze.findMany({
    where: {
      userId,
      OR: [
        { consumedFor: null },
        ...(sinceDayKey
          ? [{ consumedFor: { gte: sinceDayKey } }]
          : [{ NOT: { consumedFor: null } }]),
      ],
    },
    select: { consumedFor: true },
  });
  let available = 0;
  const frozenDays = new Set<string>();
  for (const r of rows) {
    if (r.consumedFor === null) available += 1;
    else frozenDays.add(r.consumedFor);
  }
  return { available, frozenDays };
}

// Idempotently award this week's freeze if the user is below the
// inventory cap. Returns true if a grant actually landed.
export async function grantWeeklyFreezeIfDue(
  userId: string,
): Promise<boolean> {
  const tz = await getUserTimezone(userId);
  const { available } = await getFreezeInventory(userId);
  if (available >= MAX_STORED_FREEZES) return false;

  const grantKey = `weekly:${localWeekKey(new Date(), tz)}:${tz}`;
  // Pre-check the unique key. The catch-P2002 below is still a safety
  // net for the rare concurrent-call race, but pre-checking stops Prisma
  // from logging `prisma:error` noise on every duplicate grant attempt
  // (e.g. when the dashboard / dojo / shop pages all call this in
  // parallel on a single page load).
  const existing = await prisma.streakFreeze.findUnique({
    where: { userId_grantKey: { userId, grantKey } },
    select: { id: true },
  });
  if (existing) return false;

  try {
    await prisma.streakFreeze.create({
      data: {
        userId,
        source: "weekly_grant",
        grantKey,
        consumedFor: null,
      },
    });
    return true;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
}

// Spend a single freeze on `dayKey`. Returns true if one was consumed.
// The unique (userId, consumedFor) index prevents double-spending on
// the same day across concurrent calls.
export async function consumeOneFreeze(
  userId: string,
  dayKey: string,
): Promise<boolean> {
  const candidate = await prisma.streakFreeze.findFirst({
    where: { userId, consumedFor: null },
    orderBy: { grantedAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return false;
  try {
    const updated = await prisma.streakFreeze.update({
      where: { id: candidate.id },
      data: { consumedFor: dayKey, consumedAt: new Date() },
      select: { id: true },
    });
    return Boolean(updated);
  } catch (err) {
    // P2002: another concurrent reconcile already used a freeze for
    // this day. That's fine; treat as a successful freeze either way.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return true;
    }
    throw err;
  }
}

// Walk backward from yesterday and auto-freeze any consecutive
// incomplete days, up to the user's available freeze count. Stops at
// the first day that's either completed, already frozen, or out of
// reach of available freezes.
//
// Honors the per-user `autoFreezeStreak` preference: when toggled off,
// freezes still get *granted* weekly but are **never** auto-spent —
// they sit in inventory until the user manually burns them via the
// streak calendar.
export async function reconcileStreakFreezes(userId: string): Promise<{
  consumed: number;
  granted: boolean;
}> {
  const granted = await grantWeeklyFreezeIfDue(userId);
  const prefs = await getUserPreferences(userId);
  if (!prefs.autoFreezeStreak) return { consumed: 0, granted };

  const inv = await getFreezeInventory(userId);
  if (inv.available === 0) return { consumed: 0, granted };

  const tz = await getUserTimezone(userId);
  const now = new Date();
  const todayKey = localDayKey(now, tz);
  const startOfToday = localMidnight(now, tz);
  // 60-day window mirrors getStreak()'s lookback so we don't walk past
  // the data we'd ever use to compute the current streak.
  const since = new Date(startOfToday.getTime() - 60 * 24 * 3600_000);

  const [attempts, views] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    }),
    prisma.cardView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);
  const quizByDay = new Map<string, number>();
  for (const a of attempts) {
    const d = localDayKey(a.createdAt, tz);
    quizByDay.set(d, (quizByDay.get(d) ?? 0) + a.total);
  }
  const viewsByDay = new Map<string, number>();
  for (const v of views) {
    const d = localDayKey(v.createdAt, tz);
    viewsByDay.set(d, (viewsByDay.get(d) ?? 0) + 1);
  }
  function isComplete(key: string): boolean {
    return (
      (quizByDay.get(key) ?? 0) >= DAILY_QUIZ_GOAL &&
      (viewsByDay.get(key) ?? 0) >= DAILY_CARD_GOAL
    );
  }

  let consumed = 0;
  let available = inv.available;
  let cursor = previousLocalDayKey(todayKey, tz);
  const frozen = new Set(inv.frozenDays);

  for (let safety = 0; safety < 60 && available > 0; safety++) {
    if (isComplete(cursor) || frozen.has(cursor)) {
      cursor = previousLocalDayKey(cursor, tz);
      continue;
    }
    const ok = await consumeOneFreeze(userId, cursor);
    if (!ok) break;
    consumed += 1;
    available -= 1;
    frozen.add(cursor);
    cursor = previousLocalDayKey(cursor, tz);
  }

  return { consumed, granted };
}

// =====================================================================
// Manual freeze application
// ---------------------------------------------------------------------
// Called from the UI when the user clicks "Use freeze" on a missed day.
// We re-verify server-side that the day is actually eligible (in-range,
// not in the future, not today, not already complete, not already
// frozen) so a tampered request can't burn freezes on bogus days.
// =====================================================================

const FREEZE_LOOKBACK_DAYS = 30;

export type ApplyFreezeResult =
  | { ok: true; dayKey: string; remaining: number }
  | {
      ok: false;
      reason:
        | "no_freezes"
        | "out_of_range"
        | "future_day"
        | "today_locked"
        | "already_complete"
        | "already_frozen";
    };

export async function applyFreezeToDay(
  userId: string,
  dayKey: string,
): Promise<ApplyFreezeResult> {
  const tz = await getUserTimezone(userId);
  const now = new Date();
  const todayKey = localDayKey(now, tz);

  // Reject today (the streak walker already gives "today not yet
  // complete" a free pass) and any future day.
  if (dayKey >= todayKey) {
    return {
      ok: false,
      reason: dayKey === todayKey ? "today_locked" : "future_day",
    };
  }

  // Bound the lookback: anything older than FREEZE_LOOKBACK_DAYS isn't
  // worth saving — it's already broken the streak.
  const startOfToday = localMidnight(now, tz);
  const oldestAllowed = new Date(
    startOfToday.getTime() - FREEZE_LOOKBACK_DAYS * 24 * 3600_000,
  );
  const oldestKey = localDayKey(oldestAllowed, tz);
  if (dayKey < oldestKey) {
    return { ok: false, reason: "out_of_range" };
  }

  const inv = await getFreezeInventory(userId, oldestKey);
  if (inv.frozenDays.has(dayKey)) {
    return { ok: false, reason: "already_frozen" };
  }
  if (inv.available === 0) {
    return { ok: false, reason: "no_freezes" };
  }

  // Verify the day actually missed its goals. We pull just that day's
  // attempts and views — cheap and authoritative.
  const since = new Date(startOfToday.getTime() - 60 * 24 * 3600_000);
  const [attempts, views] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    }),
    prisma.cardView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);
  let quizForDay = 0;
  let viewsForDay = 0;
  for (const a of attempts) {
    if (localDayKey(a.createdAt, tz) === dayKey) quizForDay += a.total;
  }
  for (const v of views) {
    if (localDayKey(v.createdAt, tz) === dayKey) viewsForDay += 1;
  }
  if (quizForDay >= DAILY_QUIZ_GOAL && viewsForDay >= DAILY_CARD_GOAL) {
    return { ok: false, reason: "already_complete" };
  }

  const ok = await consumeOneFreeze(userId, dayKey);
  if (!ok) return { ok: false, reason: "no_freezes" };
  return { ok: true, dayKey, remaining: Math.max(0, inv.available - 1) };
}
