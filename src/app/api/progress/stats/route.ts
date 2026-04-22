import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getKanjiQuizStats,
  getProgressSummary,
  getSlowestWords,
} from "@/lib/stats";
import { requireUserId } from "@/lib/auth-utils";
import { getDueCount, getMasteryBuckets } from "@/lib/srs";
import { getUserTimezone, localDayKey } from "@/lib/time";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

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
    select: { id: true, mode: true, total: true, correct: true, createdAt: true },
  });

  // Bucket by the user's local calendar day so the "accuracy by day"
  // chart aligns with the same rollover the streak, quests, and study
  // counters use. UTC-keyed buckets would split a single evening's
  // session across two chart columns for anyone west of UTC.
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

  return NextResponse.json({
    summary,
    slowestWords,
    attempts,
    accuracyByDay,
    kanjiStats,
    mastery,
    dueCount,
  });
}
