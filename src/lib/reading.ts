// =====================================================================
// Reading mode shared helpers (client-safe)
// ---------------------------------------------------------------------
// Pure types, stage metadata, day-of-cycle / weekday utilities, the
// Fisher-Yates shuffle, and a typed error class. Anything in here is
// safe to import from both Server and Client components.
//
// The DB-touching deck loader lives next door in `reading-server.ts`
// (which `import "server-only"`s itself) so a stray client import
// doesn't drag Prisma into the browser bundle.
//
// The play loop is described in README §Quiz engine → Reading mode.
// The bank lives in `prisma/seed/reading-words.ts` and is authored at
// 50 unique words per stage (1000 rows total in DB once seeded; the
// seed runner rotates each stage's 50 across 5 dayOfCycle slots).
//
// Day-of-cycle rules:
//
//   * Mon=1, Tue=2, Wed=3, Thu=4, Fri=5 → returned by
//     `dayOfCycleForLocalDate`. Used to auto-pick today's set.
//   * Sat & Sun → null. The setup UI exposes a manual 1..5 picker on
//     these days, and `isLocalWeekend` flags it.
//
// Everything is computed in the user's IANA timezone (resolved via
// `getUserTimezone()` from `src/lib/time.ts`) so the Reading mode's
// rollover lines up with streaks, daily quests, and "today's
// earnings" — all of which roll over at local midnight.
// =====================================================================

export type ReadingStage = 1 | 2 | 3 | 4;
export type ReadingSet = 1 | 2 | 3 | 4 | 5;

export type ReadingStageMeta = {
  stage: ReadingStage;
  /** Mora bin a stage's words sit in. */
  mora: 2 | 3 | 4 | 5;
  /** Display label, e.g. "Stage 1" / "Final Stage". */
  label: string;
  /** One-line subtitle shown beneath the label on the picker tile. */
  subtitle: string;
};

export const READING_STAGES: readonly ReadingStageMeta[] = [
  { stage: 1, mora: 2, label: "Stage 1", subtitle: "2-syllable words" },
  { stage: 2, mora: 3, label: "Stage 2", subtitle: "3-syllable words" },
  { stage: 3, mora: 4, label: "Stage 3", subtitle: "4-syllable words" },
  { stage: 4, mora: 5, label: "Final Stage", subtitle: "5-syllable words" },
];

export function getReadingStageMeta(stage: ReadingStage): ReadingStageMeta {
  return READING_STAGES[stage - 1];
}

export function isReadingStage(value: unknown): value is ReadingStage {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function isReadingSet(value: unknown): value is ReadingSet {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

// "Mon" → 1, …, "Fri" → 5; weekends → null. Defined as a const map so
// the lookup is O(1) and adding a future "no Sat" exception is one
// line.
const WEEKDAY_TO_SET: Record<string, ReadingSet | null> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: null,
  Sun: null,
};

const FULL_WEEKDAY_LABEL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function localWeekdayShort(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(now);
}

/** Returns the auto-released set (1..5) for the given local date in
 *  `tz`, or `null` on Sat / Sun (when the user picks manually). */
export function dayOfCycleForLocalDate(
  now: Date,
  tz: string,
): ReadingSet | null {
  const wk = localWeekdayShort(now, tz);
  return WEEKDAY_TO_SET[wk] ?? null;
}

export function isLocalWeekend(now: Date, tz: string): boolean {
  return dayOfCycleForLocalDate(now, tz) === null;
}

/** Pretty weekday string for the picker badge ("Wednesday"). */
export function localWeekdayLabel(now: Date, tz: string): string {
  return FULL_WEEKDAY_LABEL[localWeekdayShort(now, tz)] ?? "";
}

export type ReadingWordRow = {
  id: number;
  display: string;
  romaji: string;
  english: string;
  kanji: string | null;
  mora: number;
};

export type ResolvedReadingDeck = {
  stage: ReadingStage;
  set: ReadingSet;
  /** True when `set` was auto-picked from today's local weekday;
   *  false when the caller supplied a manual `set` (weekend). */
  isAutoSet: boolean;
  /** Pretty weekday string for the badge ("Wednesday"). */
  weekdayLabel: string;
  /** Up to 50 rows for the chosen (stage, set), already
   *  Fisher-Yates-shuffled server-side. */
  words: ReadingWordRow[];
};

/** Fisher-Yates in place, returning the same array. Used both server-
 *  side (to randomise the deck on first delivery) and client-side
 *  (to re-randomise on every page refresh per the play-loop spec). */
export function shuffleReadingWords<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export class ReadingDeckError extends Error {
  constructor(
    public readonly code:
      | "invalid_stage"
      | "invalid_set"
      | "set_required_on_weekend",
    message: string,
  ) {
    super(message);
    this.name = "ReadingDeckError";
  }
}
