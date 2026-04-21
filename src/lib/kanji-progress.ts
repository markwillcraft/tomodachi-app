import { prisma } from "@/lib/prisma";

// Server helpers for pulling per-user kanji study progress. Used by the
// Study > Kanji pages so we can mark characters viewed today or viewed
// ever without making a client round-trip on first paint.

export type KanjiProgress = {
  viewedToday: Set<string>;
  viewedEver: Set<string>;
};

export async function getKanjiProgress(userId: string): Promise<KanjiProgress> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [today, ever] = await Promise.all([
    prisma.kanjiView.findMany({
      where: { userId, createdAt: { gte: startOfDay } },
      select: { char: true },
    }),
    prisma.kanjiView.findMany({
      where: { userId },
      select: { char: true },
      distinct: ["char"],
    }),
  ]);

  return {
    viewedToday: new Set(today.map((r) => r.char)),
    viewedEver: new Set(ever.map((r) => r.char)),
  };
}
