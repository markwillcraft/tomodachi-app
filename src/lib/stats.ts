import { prisma } from "./prisma";
import type { ProgressSummary } from "./gemini";

export type SlowestWord = {
  romaji: string;
  hiragana: string;
  english: string;
  attempts: number;
  avgMs: number;
};

export async function getProgressSummary(
  userId: string,
): Promise<ProgressSummary> {
  const totalAnswered = await prisma.questionResult.count({
    where: { attempt: { userId } },
  });
  const totalCorrect = await prisma.questionResult.count({
    where: { attempt: { userId }, isCorrect: true },
  });

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    select: { mode: true, total: true, correct: true },
  });
  const accuracyByMode: Record<string, { correct: number; total: number }> = {};
  for (const a of attempts) {
    const bucket = (accuracyByMode[a.mode] ??= { correct: 0, total: 0 });
    bucket.correct += a.correct;
    bucket.total += a.total;
  }

  const grouped = await prisma.questionResult.groupBy({
    by: ["wordId"],
    where: { wordId: { not: null }, attempt: { userId } },
    _count: { _all: true },
  });

  const correctGrouped = await prisma.questionResult.groupBy({
    by: ["wordId"],
    where: {
      wordId: { not: null },
      isCorrect: true,
      attempt: { userId },
    },
    _count: { _all: true },
  });

  const correctMap = new Map<number, number>();
  for (const g of correctGrouped) {
    if (g.wordId != null) correctMap.set(g.wordId, g._count._all);
  }

  const wordIds = grouped
    .map((g) => g.wordId)
    .filter((id): id is number => id != null);
  const words = await prisma.word.findMany({
    where: { id: { in: wordIds }, userId },
  });
  const wordMap = new Map(words.map((w) => [w.id, w]));

  const perWord = grouped
    .filter((g) => g.wordId != null && g._count._all >= 2)
    .map((g) => {
      const w = wordMap.get(g.wordId!);
      const correct = correctMap.get(g.wordId!) ?? 0;
      const total = g._count._all;
      return {
        romaji: w?.romaji ?? "",
        hiragana: w?.hiragana ?? "",
        english: w?.english ?? "",
        correct,
        total,
        accuracy: correct / total,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10);

  return {
    totalAnswered,
    totalCorrect,
    accuracyByMode,
    weakestWords: perWord.map(({ accuracy: _a, ...rest }) => rest),
  };
}

export async function getWordsWithStats(userId: string) {
  const words = await prisma.word.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const grouped = await prisma.questionResult.groupBy({
    by: ["wordId", "isCorrect"],
    where: { wordId: { not: null }, attempt: { userId } },
    _count: { _all: true },
  });

  const stats = new Map<number, { totalAnswered: number; totalCorrect: number }>();
  for (const g of grouped) {
    if (g.wordId == null) continue;
    const s = stats.get(g.wordId) ?? { totalAnswered: 0, totalCorrect: 0 };
    s.totalAnswered += g._count._all;
    if (g.isCorrect) s.totalCorrect += g._count._all;
    stats.set(g.wordId, s);
  }

  return words.map((w) => ({
    ...w,
    totalAnswered: stats.get(w.id)?.totalAnswered ?? 0,
    totalCorrect: stats.get(w.id)?.totalCorrect ?? 0,
  }));
}

/**
 * Words sorted by slowest average response time (only counts questions where
 * the user answered correctly, so we measure recall speed not confusion).
 * Requires at least `minAttempts` correct attempts to surface.
 */
export async function getSlowestWords(
  userId: string,
  { minAttempts = 2, limit = 10 }: { minAttempts?: number; limit?: number } = {},
): Promise<SlowestWord[]> {
  const rows = await prisma.questionResult.findMany({
    where: {
      attempt: { userId },
      wordId: { not: null },
      isCorrect: true,
      timeMs: { not: null },
    },
    select: { wordId: true, timeMs: true },
  });

  const agg = new Map<number, { sum: number; count: number }>();
  for (const r of rows) {
    if (r.wordId == null || r.timeMs == null) continue;
    const cur = agg.get(r.wordId) ?? { sum: 0, count: 0 };
    cur.sum += r.timeMs;
    cur.count += 1;
    agg.set(r.wordId, cur);
  }

  const eligibleIds = Array.from(agg.entries())
    .filter(([, v]) => v.count >= minAttempts)
    .map(([id]) => id);

  if (eligibleIds.length === 0) return [];

  const words = await prisma.word.findMany({
    where: { id: { in: eligibleIds }, userId },
  });
  const wordMap = new Map(words.map((w) => [w.id, w]));

  return Array.from(agg.entries())
    .filter(([, v]) => v.count >= minAttempts)
    .map(([id, v]) => {
      const w = wordMap.get(id);
      return {
        romaji: w?.romaji ?? "",
        hiragana: w?.hiragana ?? "",
        english: w?.english ?? "",
        attempts: v.count,
        avgMs: Math.round(v.sum / v.count),
      };
    })
    .filter((r) => r.romaji.length > 0)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, limit);
}

export async function getAttemptHistory(userId: string) {
  return prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
