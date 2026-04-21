import { prisma } from "./prisma";
import type { ProgressSummary } from "./gemini";
import { N5_KANJI } from "./kanji";

export type SlowestWord = {
  romaji: string;
  hiragana: string;
  english: string;
  attempts: number;
  avgMs: number;
};

export type WeakestKanji = {
  char: string;
  meaning: string;
  correct: number;
  total: number;
};

export type KanjiQuizStats = {
  totalAnswered: number;
  totalCorrect: number;
  // Per-question-kind breakdown for the three kanji quiz formats.
  byKind: Record<string, { correct: number; total: number }>;
  // Per-character roll-up across all kanji question kinds.
  perChar: Array<{
    char: string;
    meaning: string;
    correct: number;
    total: number;
  }>;
  weakestKanji: WeakestKanji[];
  // Number of N5 kanji the user has at least answered once.
  charsSeen: number;
  charsTotal: number;
};

const KANJI_QUESTION_KINDS = [
  "kanji_to_meaning",
  "meaning_to_kanji",
  "kanji_to_reading",
] as const;

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

/**
 * Roll-up of every kanji question the user has ever answered. The kanji
 * itself isn't stored as a foreign key — it lives in `prompt` for the
 * kanji-as-prompt question kinds (kanji_to_meaning / kanji_to_reading)
 * and in `correct` for meaning_to_kanji. We normalize that here so the
 * progress page can show "weakest kanji" exactly the way it shows
 * weakest vocab words.
 */
export async function getKanjiQuizStats(
  userId: string,
): Promise<KanjiQuizStats> {
  const rows = await prisma.questionResult.findMany({
    where: {
      attempt: { userId },
      kind: { in: [...KANJI_QUESTION_KINDS] },
    },
    select: {
      kind: true,
      prompt: true,
      correct: true,
      isCorrect: true,
    },
  });

  const byKind: Record<string, { correct: number; total: number }> = {};
  const perCharMap = new Map<string, { correct: number; total: number }>();

  for (const r of rows) {
    const bucket = (byKind[r.kind] ??= { correct: 0, total: 0 });
    bucket.total += 1;
    if (r.isCorrect) bucket.correct += 1;

    // For meaning_to_kanji the kanji is the answer; for the other two
    // the kanji is the prompt. Either way we want one row per character.
    const char = r.kind === "meaning_to_kanji" ? r.correct : r.prompt;
    if (!char) continue;
    const stat = perCharMap.get(char) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (r.isCorrect) stat.correct += 1;
    perCharMap.set(char, stat);
  }

  const meaningByChar = new Map(N5_KANJI.map((k) => [k.char, k.meaning]));

  const perChar = Array.from(perCharMap.entries())
    .map(([char, stat]) => ({
      char,
      meaning: meaningByChar.get(char) ?? "",
      correct: stat.correct,
      total: stat.total,
    }))
    .sort((a, b) => b.total - a.total);

  // "Weakest" = at least 2 attempts, sorted by accuracy ascending. Then
  // by attempt count desc as a tiebreaker so the kanji you've struggled
  // with the most prominently bubbles up.
  const weakestKanji = perChar
    .filter((c) => c.total >= 2)
    .map((c) => ({ ...c, accuracy: c.correct / c.total }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 10)
    .map(({ accuracy: _a, ...rest }) => rest);

  const totalAnswered = rows.length;
  const totalCorrect = rows.filter((r) => r.isCorrect).length;

  return {
    totalAnswered,
    totalCorrect,
    byKind,
    perChar,
    weakestKanji,
    charsSeen: perCharMap.size,
    charsTotal: N5_KANJI.length,
  };
}
