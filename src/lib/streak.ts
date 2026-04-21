import { prisma } from "./prisma";

// To "complete" a day for the streak, the user has to:
//   1. Answer 50 quiz questions (across one or more attempts) that day, AND
//   2. View 50 vocab cards in the Study tab that day.
// Days are bucketed by UTC date (YYYY-MM-DD) so the math stays consistent
// across timezones; we surface the rule clearly in the UI.
export const DAILY_QUIZ_GOAL = 50;
export const DAILY_CARD_GOAL = 50;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type DailyProgress = {
  day: string;
  quizAnswered: number;
  cardsViewed: number;
  completed: boolean;
};

export async function getStreak(userId: string): Promise<{
  current: number;
  longest: number;
  today: DailyProgress;
  last30: DailyProgress[];
}> {
  // Pull the last ~60 days of activity. That's plenty to compute a current
  // streak and a meaningful "last 30 days" calendar without scanning history.
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 60);
  since.setUTCHours(0, 0, 0, 0);

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
    const d = isoDay(a.createdAt);
    quizByDay.set(d, (quizByDay.get(d) ?? 0) + a.total);
  }
  const viewsByDay = new Map<string, number>();
  for (const v of views) {
    const d = isoDay(v.createdAt);
    viewsByDay.set(d, (viewsByDay.get(d) ?? 0) + 1);
  }

  const todayKey = isoDay(new Date());
  const today: DailyProgress = build(
    todayKey,
    quizByDay.get(todayKey) ?? 0,
    viewsByDay.get(todayKey) ?? 0,
  );

  // Walk backward day by day from today to compute current streak. We don't
  // break the streak today if today isn't yet complete (the user might still
  // do the work later); we only break when a *prior* day is incomplete.
  let current = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (today.completed) {
    current = 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } else {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  // Now from cursor backwards, count consecutive complete days.
  while (true) {
    const k = isoDay(cursor);
    const day = build(k, quizByDay.get(k) ?? 0, viewsByDay.get(k) ?? 0);
    if (!day.completed) break;
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    // Cap to scanned window so we never loop past available data.
    if (cursor < since) break;
  }

  // Longest streak in the scanned window (good enough — exact lifetime
  // longest can come later if we want).
  const allDays = new Set<string>();
  for (const k of quizByDay.keys()) allDays.add(k);
  for (const k of viewsByDay.keys()) allDays.add(k);
  const completedDays = Array.from(allDays)
    .map((k) => build(k, quizByDay.get(k) ?? 0, viewsByDay.get(k) ?? 0))
    .filter((d) => d.completed)
    .map((d) => d.day)
    .sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of completedDays) {
    if (prev && isNextDay(prev, d)) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  // Last 30 days (today inclusive), oldest first, for a streak calendar.
  const last30: DailyProgress[] = [];
  const c = new Date();
  c.setUTCHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(c);
    d.setUTCDate(d.getUTCDate() - i);
    const k = isoDay(d);
    last30.push(build(k, quizByDay.get(k) ?? 0, viewsByDay.get(k) ?? 0));
  }

  return { current, longest, today, last30 };
}

function build(day: string, quizAnswered: number, cardsViewed: number): DailyProgress {
  return {
    day,
    quizAnswered,
    cardsViewed,
    completed:
      quizAnswered >= DAILY_QUIZ_GOAL && cardsViewed >= DAILY_CARD_GOAL,
  };
}

function isNextDay(prev: string, next: string): boolean {
  const a = new Date(prev + "T00:00:00Z");
  const b = new Date(next + "T00:00:00Z");
  const diff = (b.getTime() - a.getTime()) / 86400000;
  return Math.round(diff) === 1;
}
