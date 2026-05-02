// =====================================================================
// Reading mode — server-only deck loader
// ---------------------------------------------------------------------
// Fetches the chosen (stage, set) deck out of `ReadingWord`, applies
// the same weekday-vs-weekend resolution rules used by the API route,
// and returns the deck shuffled. Only Server Components and route
// handlers should import from here — `import "server-only"` makes a
// stray client import fail the build instead of leaking Prisma to
// the browser bundle.
//
// Pure shared helpers (types, stage metadata, weekday math, the
// Fisher-Yates shuffle) live next door in `reading.ts` and are safe
// to share.
// =====================================================================

import "server-only";

import { prisma } from "./prisma";
import {
  dayOfCycleForLocalDate,
  isReadingSet,
  isReadingStage,
  localWeekdayLabel,
  ReadingDeckError,
  shuffleReadingWords,
  type ReadingSet,
  type ReadingStage,
  type ResolvedReadingDeck,
} from "./reading";

/** Resolve today's deck for `(stage, set?)`. On weekdays `set` is
 *  ignored and derived from the local weekday; on weekends it's
 *  required. Throws `ReadingDeckError` for invalid inputs so callers
 *  (route handlers, RSC shells) can map to 4xx responses. */
export async function getReadingWordsForStageAndSet(args: {
  stage: ReadingStage;
  set?: ReadingSet;
  now: Date;
  tz: string;
}): Promise<ResolvedReadingDeck> {
  const { stage, set, now, tz } = args;
  if (!isReadingStage(stage)) {
    throw new ReadingDeckError(
      "invalid_stage",
      `stage must be 1..4, got ${String(stage)}`,
    );
  }

  const autoSet = dayOfCycleForLocalDate(now, tz);
  let resolvedSet: ReadingSet;
  let isAutoSet: boolean;

  if (autoSet !== null) {
    // Weekday — ignore any provided set and use today's auto pick.
    resolvedSet = autoSet;
    isAutoSet = true;
  } else {
    // Weekend — caller must specify the set.
    if (set === undefined || set === null) {
      throw new ReadingDeckError(
        "set_required_on_weekend",
        "set (1..5) is required on Saturday and Sunday",
      );
    }
    if (!isReadingSet(set)) {
      throw new ReadingDeckError(
        "invalid_set",
        `set must be 1..5, got ${String(set)}`,
      );
    }
    resolvedSet = set;
    isAutoSet = false;
  }

  const rows = await prisma.readingWord.findMany({
    where: { stage, dayOfCycle: resolvedSet },
    orderBy: { sortIndex: "asc" },
    select: {
      id: true,
      display: true,
      romaji: true,
      english: true,
      kanji: true,
      mora: true,
    },
  });

  return {
    stage,
    set: resolvedSet,
    isAutoSet,
    weekdayLabel: localWeekdayLabel(now, tz),
    words: shuffleReadingWords(rows.slice()),
  };
}
