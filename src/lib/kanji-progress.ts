import { prisma } from "@/lib/prisma";
import { getUserTimezone, localMidnight } from "@/lib/time";

// Server helpers for pulling per-user kanji study progress. Used by the
// Study > Kanji pages so we can mark characters viewed today or viewed
// ever without making a client round-trip on first paint.

export type KanjiProgress = {
  viewedToday: Set<string>;
  viewedEver: Set<string>;
};

export async function getKanjiProgress(userId: string): Promise<KanjiProgress> {
  // Anchor "today" to the user's local midnight — same boundary used by
  // getStreak() and the coin summary — so the viewedToday set rolls
  // over when the user's day flips, not at UTC midnight.
  const tz = await getUserTimezone(userId);
  const startOfDay = localMidnight(new Date(), tz);

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
