import { prisma } from "@/lib/prisma";
import {
  getKanjiQuizStats,
  getProgressSummary,
  getSlowestWords,
  type KanjiQuizStats,
  type SlowestWord,
} from "@/lib/stats";
import { getDueCount, getMasteryBuckets } from "@/lib/srs";
import { getUserTimezone, localDayKey } from "@/lib/time";
import type { ProgressSummary } from "@/lib/gemini";

export type ProgressStatsAttempt = {
  id: number;
  mode: string;
  total: number;
  correct: number;
  createdAt: Date;
};

export type ProgressStats = {
  summary: ProgressSummary;
  slowestWords: SlowestWord[];
  attempts: ProgressStatsAttempt[];
  accuracyByDay: Array<{ day: string; accuracy: number; total: number }>;
  kanjiStats: KanjiQuizStats;
  mastery: {
    learning: number;
    reviewing: number;
    familiar: number;
    mastered: number;
    tracked: number;
  };
  dueCount: number;
};

/**
 * Single source of truth for the /progress page payload.
 *
 * Both the Server Component at `/progress` and the
 * `/api/progress/stats` API route call this. Keeping the
 * heavy fan-out in one place means future caching, query
 * tuning, or pagination changes apply to both.
 */
export async function getProgressStatsForUser(
  userId: string,
): Promise<ProgressStats> {
  const [summary, slowestWords, kanjiStats, mastery, dueCount, tz] =
    await Promise.all([
      getProgressSummary(userId),
      getSlowestWords(userId),
      getKanjiQuizStats(userId),
      getMasteryBuckets(userId),
      getDueCount(userId),
      getUserTimezone(userId),
    ]);

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      mode: true,
      total: true,
      correct: true,
      createdAt: true,
    },
  });

  // Bucket by the user's local calendar day so the "accuracy by
  // day" chart aligns with the same rollover the streak, quests,
  // and study counters use. UTC-keyed buckets would split a single
  // evening's session across two chart columns for anyone west of
  // UTC.
  const byDay = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const day = localDayKey(a.createdAt, tz);
    const b = byDay.get(day) ?? { correct: 0, total: 0 };
    b.correct += a.correct;
    b.total += a.total;
    byDay.set(day, b);
  }
  const accuracyByDay = Array.from(byDay.entries()).map(([day, v]) => ({
    day,
    accuracy: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
    total: v.total,
  }));

  return {
    summary,
    slowestWords,
    attempts,
    accuracyByDay,
    kanjiStats,
    mastery,
    dueCount,
  };
}
