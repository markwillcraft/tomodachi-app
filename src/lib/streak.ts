import { prisma } from "./prisma";
import { getFreezeInventory } from "./streak-freeze";
import {
  getUserTimezone,
  localDayKey,
  localMidnight,
  previousLocalDayKey,
} from "./time";

// To "complete" a day for the streak, the user has to:
//   1. Answer 50 quiz questions (across one or more attempts) that day, AND
//   2. View 50 vocab cards in the Study tab that day.
// Days are bucketed by the user's *local* date (YYYY-MM-DD in their IANA
// timezone) so the rollover happens at their local midnight, not UTC's.
// We surface the rule clearly in the UI.
export const DAILY_QUIZ_GOAL = 50;
export const DAILY_CARD_GOAL = 50;

export type DailyProgress = {
  day: string;
  quizAnswered: number;
  cardsViewed: number;
  completed: boolean;
  // True when the day didn't actually hit the goal but was saved by a
  // consumed StreakFreeze. The streak walker counts frozen days toward
  // the current streak; UI surfaces them with a shield instead of a
  // checkmark.
  frozen?: boolean;
};

export async function getStreak(userId: string): Promise<{
  current: number;
  longest: number;
  today: DailyProgress;
  last30: DailyProgress[];
  freezesAvailable: number;
  frozenDaysInWindow: number;
}> {
  const tz = await getUserTimezone(userId);

  // Pull the last ~60 days of activity. That's plenty to compute a current
  // streak and a meaningful "last 30 days" calendar without scanning the
  // whole history. We anchor the lookback to *local* midnight 60 days ago
  // so the boundaries line up with how we bucket below.
  const now = new Date();
  const startOfToday = localMidnight(now, tz);
  const since = new Date(startOfToday.getTime() - 60 * 24 * 3600_000);

  const sinceKey = localDayKey(since, tz);
  const [attempts, views, inventory] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    }),
    prisma.cardView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    getFreezeInventory(userId, sinceKey),
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

  const frozenDays = inventory.frozenDays;
  const todayKey = localDayKey(now, tz);
  const today: DailyProgress = build(
    todayKey,
    quizByDay.get(todayKey) ?? 0,
    viewsByDay.get(todayKey) ?? 0,
    frozenDays.has(todayKey),
  );

  // Walk backward day by day from today to compute current streak. We
  // don't break the streak today if today isn't yet complete (the user
  // might still do the work later); we only break when a *prior* day is
  // incomplete *and* unfrozen.
  let current = 0;
  let cursorKey = todayKey;
  if (today.completed) {
    current = 1;
  }
  cursorKey = previousLocalDayKey(cursorKey, tz);

  // Cap by lookback window so we never loop past available data.
  for (let safety = 0; safety < 60; safety++) {
    const day = build(
      cursorKey,
      quizByDay.get(cursorKey) ?? 0,
      viewsByDay.get(cursorKey) ?? 0,
      frozenDays.has(cursorKey),
    );
    if (!day.completed && !day.frozen) break;
    current += 1;
    cursorKey = previousLocalDayKey(cursorKey, tz);
  }

  // Longest streak in the scanned window (good enough — exact lifetime
  // longest can come later if we want). Frozen days count as completed
  // for the longest-run purposes so a single missed day doesn't
  // artificially cap the all-time best.
  const allDays = new Set<string>();
  for (const k of quizByDay.keys()) allDays.add(k);
  for (const k of viewsByDay.keys()) allDays.add(k);
  for (const k of frozenDays) allDays.add(k);
  const completedDays = Array.from(allDays)
    .map((k) =>
      build(
        k,
        quizByDay.get(k) ?? 0,
        viewsByDay.get(k) ?? 0,
        frozenDays.has(k),
      ),
    )
    .filter((d) => d.completed || d.frozen)
    .map((d) => d.day)
    .sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of completedDays) {
    if (prev && previousLocalDayKey(d, tz) === prev) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  // Last 30 local days (today inclusive), oldest first, for a streak
  // calendar.
  const last30: DailyProgress[] = [];
  let walkKey = todayKey;
  // Build from today backwards then reverse so order is oldest-first.
  const stack: string[] = [];
  for (let i = 0; i < 30; i++) {
    stack.push(walkKey);
    walkKey = previousLocalDayKey(walkKey, tz);
  }
  for (const k of stack.reverse()) {
    last30.push(
      build(
        k,
        quizByDay.get(k) ?? 0,
        viewsByDay.get(k) ?? 0,
        frozenDays.has(k),
      ),
    );
  }

  let frozenDaysInWindow = 0;
  for (const d of last30) if (d.frozen) frozenDaysInWindow += 1;

  return {
    current,
    longest,
    today,
    last30,
    freezesAvailable: inventory.available,
    frozenDaysInWindow,
  };
}

function build(
  day: string,
  quizAnswered: number,
  cardsViewed: number,
  frozen: boolean,
): DailyProgress {
  const completed =
    quizAnswered >= DAILY_QUIZ_GOAL && cardsViewed >= DAILY_CARD_GOAL;
  return {
    day,
    quizAnswered,
    cardsViewed,
    completed,
    // Only mark frozen when the day *needed* saving. Completed days
    // shouldn't waste the freeze indicator.
    frozen: frozen && !completed,
  };
}
