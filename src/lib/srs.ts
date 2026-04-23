import { prisma } from "./prisma";
import type { QuestionKind } from "./quiz";

// =====================================================================
// Spaced repetition (Leitner-style)
// ---------------------------------------------------------------------
// Each item (a vocab word, a kanji character, or a kana character) has
// a `level` 1..6. A correct answer promotes one level (max 6 =
// mastered); a wrong answer resets to 1. The `nextReviewAt` timestamp
// schedules when the item re-enters the "due today" queue.
//
// We only advance levels on *quiz* answers, not casual card views, to
// avoid free-mastering everything just by flipping cards. A wrong
// answer resets aggressively so we drill the gap again within the hour.
// =====================================================================

export type ItemType = "vocab" | "kanji" | "kana";

// Hours until next review for each level. Levels are 1-indexed so the
// array has a dummy slot at [0] for cleaner math.
const INTERVAL_HOURS: number[] = [0, 0.25, 20, 72, 168, 384, 1080];

export const MAX_SRS_LEVEL = 6;

export function intervalHoursForLevel(level: number): number {
  if (level < 1) return INTERVAL_HOURS[1];
  if (level > MAX_SRS_LEVEL) return INTERVAL_HOURS[MAX_SRS_LEVEL];
  return INTERVAL_HOURS[level];
}

// Derive the SRS item this quiz result targets. Returns null for
// question kinds that don't cleanly map to a single learnable item
// (shouldn't happen with the current QuestionKind union, but we're
// defensive so future kinds don't blow up the endpoint).
export function itemFromResult(
  kind: QuestionKind | string,
  prompt: string,
  correct: string,
  wordId: number | null,
): { type: ItemType; key: string } | null {
  switch (kind) {
    case "kana_to_romaji":
    case "romaji_to_english":
    case "romaji_to_kana":
      return wordId !== null ? { type: "vocab", key: String(wordId) } : null;
    case "hiragana_char":
    case "katakana_char":
      return { type: "kana", key: prompt };
    case "kanji_to_meaning":
    case "kanji_to_reading":
      return { type: "kanji", key: prompt };
    case "meaning_to_kanji":
      return { type: "kanji", key: correct };
    default:
      return null;
  }
}

export type ReviewOutcome = {
  itemType: ItemType;
  itemKey: string;
  // Level *before* this answer was applied (1 if brand-new).
  prevLevel: number;
  // Level *after* this answer was applied.
  level: number;
  isNew: boolean;
  leveledUp: boolean;
  reset: boolean;
  mastered: boolean;
  totalCorrect: number;
  totalSeen: number;
  nextReviewAt: Date;
};

// Record a single quiz result against the SRS schedule. Idempotent in
// spirit (each call advances state once) — we don't dedup on result id
// because every quiz answer is meaningful signal. Upserts the row if
// the item has never been seen. Returns the post-update snapshot so
// the caller (typically POST /api/quiz/submit) can surface the new
// mastery level on the results screen.
export async function recordReview(
  userId: string,
  itemType: ItemType,
  itemKey: string,
  isCorrect: boolean,
): Promise<ReviewOutcome> {
  const existing = await prisma.reviewState.findUnique({
    where: {
      userId_itemType_itemKey: { userId, itemType, itemKey },
    },
  });
  const now = new Date();
  if (!existing) {
    const level = isCorrect ? 2 : 1;
    const nextReviewAt = new Date(
      now.getTime() + intervalHoursForLevel(level) * 3600_000,
    );
    await prisma.reviewState.create({
      data: {
        userId,
        itemType,
        itemKey,
        level,
        correctStreak: isCorrect ? 1 : 0,
        totalCorrect: isCorrect ? 1 : 0,
        totalSeen: 1,
        nextReviewAt,
        lastReviewedAt: now,
      },
    });
    return {
      itemType,
      itemKey,
      prevLevel: 1,
      level,
      isNew: true,
      leveledUp: isCorrect,
      reset: false,
      mastered: level >= MAX_SRS_LEVEL,
      totalCorrect: isCorrect ? 1 : 0,
      totalSeen: 1,
      nextReviewAt,
    };
  }
  const nextLevel = isCorrect
    ? Math.min(existing.level + 1, MAX_SRS_LEVEL)
    : 1;
  const nextReviewAt = new Date(
    now.getTime() + intervalHoursForLevel(nextLevel) * 3600_000,
  );
  await prisma.reviewState.update({
    where: { id: existing.id },
    data: {
      level: nextLevel,
      correctStreak: isCorrect ? existing.correctStreak + 1 : 0,
      totalCorrect: existing.totalCorrect + (isCorrect ? 1 : 0),
      totalSeen: existing.totalSeen + 1,
      nextReviewAt,
      lastReviewedAt: now,
    },
  });
  return {
    itemType,
    itemKey,
    prevLevel: existing.level,
    level: nextLevel,
    isNew: false,
    leveledUp: nextLevel > existing.level,
    reset: !isCorrect && existing.level > 1,
    mastered: nextLevel >= MAX_SRS_LEVEL,
    totalCorrect: existing.totalCorrect + (isCorrect ? 1 : 0),
    totalSeen: existing.totalSeen + 1,
    nextReviewAt,
  };
}

export type DueItem = {
  itemType: ItemType;
  itemKey: string;
  level: number;
  nextReviewAt: Date;
};

// Fetch items whose `nextReviewAt` has already passed. We cap the list
// so a very stale user doesn't get smacked with 400 due items at once;
// 40 is enough for a ~10-minute session. Ordered by earliest due so we
// tackle the oldest gaps first.
export async function getDueItems(
  userId: string,
  limit = 40,
): Promise<DueItem[]> {
  const rows = await prisma.reviewState.findMany({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
      level: { lt: MAX_SRS_LEVEL },
    },
    orderBy: { nextReviewAt: "asc" },
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      itemType: true,
      itemKey: true,
      level: true,
      nextReviewAt: true,
    },
  });
  return rows.map((r) => ({
    itemType: r.itemType as ItemType,
    itemKey: r.itemKey,
    level: r.level,
    nextReviewAt: r.nextReviewAt,
  }));
}

export async function getDueCount(userId: string): Promise<number> {
  return prisma.reviewState.count({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
      level: { lt: MAX_SRS_LEVEL },
    },
  });
}

export type MasteryBuckets = {
  learning: number;
  reviewing: number;
  familiar: number;
  mastered: number;
  tracked: number;
};

// Group review states into four buckets for a mastery chart. Cutoffs
// match the intervals: level 1 = just saw it, 2-3 = learning, 4-5 =
// reviewing in days/weeks, 6 = mastered (~45 days out).
export async function getMasteryBuckets(
  userId: string,
): Promise<MasteryBuckets> {
  const rows = await prisma.reviewState.groupBy({
    by: ["level"],
    where: { userId },
    _count: { _all: true },
  });
  const buckets: MasteryBuckets = {
    learning: 0,
    reviewing: 0,
    familiar: 0,
    mastered: 0,
    tracked: 0,
  };
  for (const r of rows) {
    const n = r._count._all;
    buckets.tracked += n;
    if (r.level <= 2) buckets.learning += n;
    else if (r.level <= 3) buckets.reviewing += n;
    else if (r.level <= 5) buckets.familiar += n;
    else buckets.mastered += n;
  }
  return buckets;
}
