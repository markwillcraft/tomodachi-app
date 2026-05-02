import "server-only";

import { prisma } from "./prisma";
import { getUserTimezone, localDayKey, localMidnight } from "./time";

// =====================================================================
// Weekly engagement aggregator
// ---------------------------------------------------------------------
// Source signal for the progressive daily-quest tier classifier
// (`src/lib/quest-tier.ts`). Returns last-7-local-days totals across
// every study surface so we can ask "is this a starter, a steady
// learner, or a power user?" without slicing the data twice.
//
// "Last 7 days" = the user's local-midnight-anchored window of seven
// completed local days *plus today so far*. Anchoring to local
// midnight keeps the rollover consistent with streaks, daily quests,
// and "today's earnings" — same time semantics everywhere.
//
// Every counter goes through `Promise.all` so the helper costs ~one
// round-trip's worth of DB latency regardless of how many surfaces
// we add over time.
// =====================================================================

export type WeeklyEngagement = {
  /** "YYYY-MM-DD" of the earliest local day in the window. */
  startDayKey: string;
  /** "YYYY-MM-DD" of the latest local day in the window (today). */
  endDayKey: string;
  /** Sum of `QuizAttempt.total` over the window. */
  quizAnswered: number;
  /** Sum of `QuizAttempt.correct` over the window. */
  quizCorrect: number;
  /** correct/total as a 0..1 fraction; 0 when no quizzes. */
  quizAccuracy: number;
  /** Number of quiz attempts (any size). */
  quizAttempts: number;
  /** `CardView` rows in the window. */
  cardsViewed: number;
  /** `KanjiView` rows in the window. */
  kanjiViewed: number;
  /** `KanaView` rows in the window. */
  kanaViewed: number;
  /** `ReadingSession` rows in the window. */
  kanaReadingSessions: number;
  /** `KanaDrillSession` rows in the window. */
  kanaDrillSessions: number;
  /** `DojoProgress` rows whose `passedAt` lands in the window. */
  dojoSectionsPassed: number;
  /** Number of distinct local days with *any* activity above. */
  activeDays: number;
};

/** Returns the empty-window default. Useful for brand-new users
 *  where we just defaulted them into the "starter" tier without
 *  doing any DB work. */
export function emptyWeeklyEngagement(
  startDayKey: string,
  endDayKey: string,
): WeeklyEngagement {
  return {
    startDayKey,
    endDayKey,
    quizAnswered: 0,
    quizCorrect: 0,
    quizAccuracy: 0,
    quizAttempts: 0,
    cardsViewed: 0,
    kanjiViewed: 0,
    kanaViewed: 0,
    kanaReadingSessions: 0,
    kanaDrillSessions: 0,
    dojoSectionsPassed: 0,
    activeDays: 0,
  };
}

export async function getWeeklyEngagement(
  userId: string,
): Promise<WeeklyEngagement> {
  const tz = await getUserTimezone(userId);
  const now = new Date();
  const startOfToday = localMidnight(now, tz);
  // 7-day window: today + 6 past local days. We use 7 * 24 hours
  // straight from local midnight; DST drift on the start edge would
  // at most shift the window by 1 hour, which doesn't matter for
  // tier thresholds expressed in tens-of-questions granularity.
  const since = new Date(startOfToday.getTime() - 6 * 24 * 3600_000);
  const startDayKey = localDayKey(since, tz);
  const endDayKey = localDayKey(now, tz);

  const [
    attempts,
    cardViews,
    kanjiViews,
    kanaViews,
    readingSessions,
    drillSessions,
    dojoPasses,
  ] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { total: true, correct: true, createdAt: true },
    }),
    prisma.cardView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.kanjiView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.kanaView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.readingSession.findMany({
      where: { userId, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.kanaDrillSession.findMany({
      where: { userId, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.dojoProgress.findMany({
      where: { userId, passedAt: { gte: since } },
      select: { passedAt: true },
    }),
  ]);

  let quizAnswered = 0;
  let quizCorrect = 0;
  for (const a of attempts) {
    quizAnswered += a.total;
    quizCorrect += a.correct;
  }

  // Active days: union of every event's local day. We tally the set
  // sizes inline to avoid materialising a giant array of date strings.
  const activeDays = new Set<string>();
  for (const a of attempts) activeDays.add(localDayKey(a.createdAt, tz));
  for (const v of cardViews) activeDays.add(localDayKey(v.createdAt, tz));
  for (const v of kanjiViews) activeDays.add(localDayKey(v.createdAt, tz));
  for (const v of kanaViews) activeDays.add(localDayKey(v.createdAt, tz));
  for (const r of readingSessions)
    activeDays.add(localDayKey(r.completedAt, tz));
  for (const d of drillSessions) activeDays.add(localDayKey(d.completedAt, tz));
  for (const d of dojoPasses) {
    if (d.passedAt) activeDays.add(localDayKey(d.passedAt, tz));
  }

  return {
    startDayKey,
    endDayKey,
    quizAnswered,
    quizCorrect,
    quizAccuracy: quizAnswered > 0 ? quizCorrect / quizAnswered : 0,
    quizAttempts: attempts.length,
    cardsViewed: cardViews.length,
    kanjiViewed: kanjiViews.length,
    kanaViewed: kanaViews.length,
    kanaReadingSessions: readingSessions.length,
    kanaDrillSessions: drillSessions.length,
    dojoSectionsPassed: dojoPasses.length,
    activeDays: activeDays.size,
  };
}
