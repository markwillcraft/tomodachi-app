import { prisma } from "./prisma";
import { HIRAGANA, KATAKANA } from "./kana";
import { N5_KANJI } from "./kanji";
import { CATEGORIES } from "./categories";
import { N5_LESSONS } from "./grammar";
import { MAX_SRS_LEVEL } from "./srs";

// =====================================================================
// N5 mastery paths
// ---------------------------------------------------------------------
// A scalable, single-source-of-truth catalog of every "axis" that
// contributes to the N5 grand achievement. Each axis is a learnable
// surface (kana, kanji, vocab, grammar, listening, etc.) with:
//   - a stable id we can persist against
//   - a fixed catalog (so progress is finite and visualizable)
//   - a target count of "mastered" items
//   - a weight in the grand-total %
//   - a status flag — `coming-soon` paths are excluded from the
//     percentage so we can ship the modal UI today and turn weights
//     on as features land without rebalancing twice.
//
// To add a new axis (e.g. listening tracking) you only need to:
//   1. Add a `N5PathDef` here with status: "live" and a non-zero weight.
//   2. Implement its `loadItems()` to produce the {key, label, sub,
//      level, mastered} list.
//   3. Optionally re-balance other live weights so they still sum to 1.
// The achievements card, modal, and SRS counters all pick it up
// automatically via getN5PathsProgress().
// =====================================================================

export type N5PathId =
  | "kana"
  | "kanji"
  | "vocab"
  | "grammar"
  | "listening"
  | "writing"
  | "speaking";

export type N5PathStatus = "live" | "coming-soon";

export type N5PathItem = {
  // Stable lookup key (kana char, kanji char, romaji, lesson slug, ...).
  key: string;
  // Primary label shown in the modal (Japanese for kana/kanji/vocab).
  label: string;
  // Secondary label — romaji, English meaning, lesson title, etc.
  sub?: string;
  // SRS level 0..6. 0 = never seen / not yet tracked.
  level: number;
  mastered: boolean;
  // True when the user has at least one *study* interaction for this
  // item (kana table tap, vocab card flip, kanji study tap) but no
  // SRS row yet. Lets the modal show "Started" for items the user
  // has explored without drilling them in a quiz. Set to false once
  // `level >= 1` (the SRS level is the more accurate signal then).
  started: boolean;
};

export type N5PathProgress = {
  id: N5PathId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  tone: PathTone;
  status: N5PathStatus;
  weight: number;
  total: number;
  // Items touched by the user (level >= 1).
  seen: number;
  // Items at SRS MAX_LEVEL.
  mastered: number;
  // 0..100 — share of mastered items vs total.
  pct: number;
  // Goal for the achievements progress card; identical to `total` for
  // most paths but we keep it separate so future paths can declare
  // "to count this as 100% you need X mastered" if they don't want
  // strict full coverage.
  goal: number;
  items: N5PathItem[];
  // True when this path can't be evaluated yet (catalog empty or
  // status === "coming-soon"). The UI shows a placeholder tab.
  comingSoon: boolean;
};

export type PathTone = "violet" | "emerald" | "amber" | "rose" | "sky" | "slate";

type N5PathDef = {
  id: N5PathId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  tone: PathTone;
  status: N5PathStatus;
  // Relative weight in the N5 grand percentage. Only `live` paths
  // contribute; the function below normalizes weights so the sum of
  // live weights is always 1.
  weight: number;
  // Fraction of the catalog that counts as "100%" complete. 1.0 means
  // every item must be mastered; 0.4 means mastering 40% of the
  // catalog already counts as a fully completed path. Useful for big
  // catalogs (vocab) where requiring 100% of 600+ words would make
  // N5 grand unreachable.
  completion: number;
};

// Catalog. Order here is the order tabs render in the modal.
const PATHS: N5PathDef[] = [
  {
    id: "kana",
    label: "Kana",
    shortLabel: "Kana",
    description: "Hiragana + katakana — the alphabets you read everything in.",
    icon: "あ",
    tone: "violet",
    status: "live",
    weight: 1,
    // 0.9 leaves a small buffer for the rarest kana combos (e.g.
    // ヴ-row) without making the goal unreachable.
    completion: 0.9,
  },
  {
    id: "kanji",
    label: "Kanji",
    shortLabel: "Kanji",
    description: "All 100 N5 kanji and their readings.",
    icon: "漢",
    tone: "rose",
    status: "live",
    weight: 1,
    completion: 1,
  },
  {
    id: "vocab",
    label: "Vocab",
    shortLabel: "Vocab",
    description: "Core N5 vocabulary across every category.",
    icon: "語",
    tone: "amber",
    status: "live",
    // Bumped from 0.4 → 0.75. The N5 word list is broader than kana
    // or kanji so requiring three-quarters of the catalog is a much
    // stronger proxy for real N5 reading comprehension while still
    // staying short of the 100% bar.
    weight: 1,
    completion: 0.75,
  },
  {
    id: "grammar",
    label: "Grammar",
    shortLabel: "Grammar",
    description: "Particles, sentence patterns, and conjugations.",
    icon: "文",
    tone: "emerald",
    status: "coming-soon",
    weight: 1,
    completion: 1,
  },
  {
    id: "listening",
    label: "Listening",
    shortLabel: "Listen",
    description: "Native-audio drills for ear training.",
    icon: "🎧",
    tone: "sky",
    status: "coming-soon",
    weight: 0.5,
    completion: 1,
  },
  {
    id: "writing",
    label: "Writing",
    shortLabel: "Write",
    description: "Stroke order and sentence composition.",
    icon: "✍️",
    tone: "slate",
    status: "coming-soon",
    weight: 0.5,
    completion: 1,
  },
  {
    id: "speaking",
    label: "Speaking",
    shortLabel: "Speak",
    description: "Shadowing and pronunciation drills.",
    icon: "🗣️",
    tone: "slate",
    status: "coming-soon",
    weight: 0.5,
    completion: 1,
  },
];

export function getN5PathDefs(): readonly N5PathDef[] {
  return PATHS;
}

// Build the kana catalog: hiragana first, then katakana. Skip
// duplicate readings that appear in both syllabaries — we still
// surface both rows because mastery is per-character (じ vs ジ are
// separate ReviewState rows).
//
// Catalogs are derived from static module-level constants (HIRAGANA,
// N5_KANJI, ...) so we compute them lazily *once* per process and
// cache them. Without the cache, every N5 modal render or
// achievement evaluation re-walks all four lists.
const KANA_CATALOG: ReadonlyArray<{ key: string; label: string; sub: string }> =
  (() => {
    const out: Array<{ key: string; label: string; sub: string }> = [];
    for (const p of HIRAGANA) {
      out.push({ key: p.kana, label: p.kana, sub: `Hiragana · ${p.romaji}` });
    }
    for (const p of KATAKANA) {
      out.push({ key: p.kana, label: p.kana, sub: `Katakana · ${p.romaji}` });
    }
    return out;
  })();

const KANJI_CATALOG: ReadonlyArray<{
  key: string;
  label: string;
  sub: string;
}> = N5_KANJI.map((k) => ({
  key: k.char,
  label: k.char,
  sub: k.meaning,
}));

// Distinct N5 vocab across all categories — deduped on romaji so
// words that sit in multiple categories (e.g. greetings + people)
// only count once.
const VOCAB_CATALOG: ReadonlyArray<{
  key: string;
  label: string;
  sub: string;
  romaji: string;
}> = (() => {
  const seen = new Map<
    string,
    { key: string; label: string; sub: string; romaji: string }
  >();
  for (const cat of CATEGORIES) {
    for (const w of cat.words) {
      if (seen.has(w.romaji)) continue;
      seen.set(w.romaji, {
        key: w.romaji,
        label: w.hiragana || w.katakana || w.romaji,
        sub: w.english,
        romaji: w.romaji,
      });
    }
  }
  return Array.from(seen.values());
})();

const GRAMMAR_CATALOG: ReadonlyArray<{
  key: string;
  label: string;
  sub: string;
}> = N5_LESSONS.map((l) => ({
  key: l.slug,
  label: l.title,
  sub: l.meaning,
}));

// Total catalog size per path. Exposed so the achievements page can
// render "200 / 410" style targets on the N5 hero card.
export function getN5PathTotal(id: N5PathId): number {
  switch (id) {
    case "kana":
      return KANA_CATALOG.length;
    case "kanji":
      return KANJI_CATALOG.length;
    case "vocab":
      return VOCAB_CATALOG.length;
    case "grammar":
      return GRAMMAR_CATALOG.length;
    case "listening":
    case "writing":
    case "speaking":
      return 0;
  }
}

// Map a path's numeric goal — what counts as "100% complete on this
// axis" for the N5 grand percentage. Vocab uses a partial completion
// since the catalog is huge; everything else is full coverage.
export function getN5PathGoal(id: N5PathId): number {
  const def = PATHS.find((p) => p.id === id);
  if (!def) return 0;
  const total = getN5PathTotal(id);
  if (total === 0) return 0;
  return Math.max(1, Math.round(total * def.completion));
}

type CatalogItem = {
  key: string;
  label: string;
  sub: string;
  romaji?: string;
};

function loadCatalog(id: N5PathId): readonly CatalogItem[] {
  switch (id) {
    case "kana":
      return KANA_CATALOG;
    case "kanji":
      return KANJI_CATALOG;
    case "vocab":
      return VOCAB_CATALOG;
    case "grammar":
      return GRAMMAR_CATALOG;
    case "listening":
    case "writing":
    case "speaking":
      return [];
  }
}

// Build a path's `N5PathProgress` from already-fetched data. Pure
// (no DB calls) so we can call it once per path after a single
// batched fetch in `getN5PathsProgress`.
function buildPathProgress(
  def: N5PathDef,
  catalog: readonly CatalogItem[],
  levels: Map<string, number>,
  studied: Set<string>,
): N5PathProgress {
  const total = catalog.length;
  const goal = getN5PathGoal(def.id);
  const comingSoon = def.status === "coming-soon" || total === 0;

  let seen = 0;
  let mastered = 0;
  const items: N5PathItem[] = catalog.map((c) => {
    const level = levels.get(c.key) ?? 0;
    if (level >= 1) seen += 1;
    const isMastered = level >= MAX_SRS_LEVEL;
    if (isMastered) mastered += 1;
    // "Started" is only meaningful pre-SRS. Once an item has a level
    // the level itself is the more accurate progress signal, so we
    // suppress `started` to avoid double-counting it in the modal.
    const isStarted = level === 0 && studied.has(c.key);
    return {
      key: c.key,
      label: c.label,
      sub: c.sub,
      level,
      mastered: isMastered,
      started: isStarted,
    };
  });

  // One-decimal precision so the bar moves perceptibly with each
  // single-item mastery (especially on big catalogs like vocab where
  // 1 / 131 ≈ 0.76% — invisible after Math.round).
  const pct =
    goal === 0
      ? 0
      : Math.min(100, Math.round((mastered / goal) * 1000) / 10);

  return {
    id: def.id,
    label: def.label,
    shortLabel: def.shortLabel,
    description: def.description,
    icon: def.icon,
    tone: def.tone,
    status: def.status,
    weight: def.weight,
    total,
    seen,
    mastered,
    pct,
    goal,
    items,
    comingSoon,
  };
}

export type N5PathsSnapshot = {
  paths: N5PathProgress[];
  // Flat counts used by the legacy N5GrandCard hero strip.
  kanaMastered: number;
  kanjiMastered: number;
  vocabMastered: number;
  // 0..100 — weighted average across live paths only.
  grandPct: number;
};

// Batched fetcher: pulls every piece of progress data for *all* live
// N5 paths in one set of parallel queries. Compared to the old
// per-path approach this:
//   • fetches `Word.findMany` ONCE instead of twice (vocab levels +
//     vocab studied both used to fetch it),
//   • fetches `reviewState` in one query grouped by itemType instead
//     of three,
//   • skips view-log queries entirely when those tables are empty
//     (still 2 queries because we need the count signal regardless).
export async function getN5PathsProgress(
  userId: string,
): Promise<N5PathsSnapshot> {
  const liveIds = new Set<N5PathId>(
    PATHS.filter((p) => p.status === "live").map((p) => p.id),
  );
  const needsVocab = liveIds.has("vocab");

  const [
    reviewRows,
    kanaViewRows,
    kanjiViewRows,
    cardViewRows,
    wordRows,
  ] = await Promise.all([
    // All ReviewState rows for kana/kanji/vocab in one query.
    liveIds.size > 0
      ? prisma.reviewState.findMany({
          where: {
            userId,
            itemType: { in: ["kana", "kanji", "vocab"] },
          },
          select: { itemType: true, itemKey: true, level: true },
        })
      : Promise.resolve(
          [] as Array<{ itemType: string; itemKey: string; level: number }>,
        ),
    liveIds.has("kana")
      ? prisma.kanaView.findMany({
          where: { userId },
          select: { kana: true },
          distinct: ["kana"],
        })
      : Promise.resolve([] as Array<{ kana: string }>),
    liveIds.has("kanji")
      ? prisma.kanjiView.findMany({
          where: { userId },
          select: { char: true },
          distinct: ["char"],
        })
      : Promise.resolve([] as Array<{ char: string }>),
    needsVocab
      ? prisma.cardView.findMany({
          where: { userId },
          select: { wordId: true },
          distinct: ["wordId"],
        })
      : Promise.resolve([] as Array<{ wordId: number }>),
    // Vocab path needs a wordId → romaji map for *both* level lookup
    // (ReviewState.itemKey is `String(wordId)`) and study lookup
    // (CardView.wordId). Pull the word list ONCE.
    needsVocab
      ? prisma.word.findMany({
          where: { userId },
          select: { id: true, romaji: true },
        })
      : Promise.resolve([] as Array<{ id: number; romaji: string }>),
  ]);

  // Bucket review rows by item type.
  const kanaLevels = new Map<string, number>();
  const kanjiLevels = new Map<string, number>();
  const vocabLevelsByItemKey = new Map<string, number>();
  for (const r of reviewRows) {
    if (r.itemType === "kana") kanaLevels.set(r.itemKey, r.level);
    else if (r.itemType === "kanji") kanjiLevels.set(r.itemKey, r.level);
    else if (r.itemType === "vocab") vocabLevelsByItemKey.set(r.itemKey, r.level);
  }

  // Build the wordId → romaji map once and reuse for both lookups.
  const wordIdToRomaji = new Map<string, string>();
  const wordIdNumToRomaji = new Map<number, string>();
  for (const w of wordRows) {
    wordIdToRomaji.set(String(w.id), w.romaji);
    wordIdNumToRomaji.set(w.id, w.romaji);
  }
  const vocabLevels = new Map<string, number>();
  for (const [itemKey, level] of vocabLevelsByItemKey) {
    const romaji = wordIdToRomaji.get(itemKey);
    if (romaji) vocabLevels.set(romaji, level);
  }

  // Studied sets.
  const kanaStudied = new Set(kanaViewRows.map((r) => r.kana));
  const kanjiStudied = new Set(kanjiViewRows.map((r) => r.char));
  const vocabStudied = new Set<string>();
  for (const v of cardViewRows) {
    const r = wordIdNumToRomaji.get(v.wordId);
    if (r) vocabStudied.add(r);
  }

  const empty = new Map<string, number>();
  const emptySet = new Set<string>();

  const paths: N5PathProgress[] = PATHS.map((def) => {
    switch (def.id) {
      case "kana":
        return buildPathProgress(def, KANA_CATALOG, kanaLevels, kanaStudied);
      case "kanji":
        return buildPathProgress(def, KANJI_CATALOG, kanjiLevels, kanjiStudied);
      case "vocab":
        return buildPathProgress(def, VOCAB_CATALOG, vocabLevels, vocabStudied);
      case "grammar":
        return buildPathProgress(def, GRAMMAR_CATALOG, empty, emptySet);
      default:
        // Coming-soon paths with empty catalogs — buildPathProgress
        // marks them as comingSoon automatically.
        return buildPathProgress(def, [], empty, emptySet);
    }
  });

  // Weighted average across live paths. Coming-soon paths contribute 0
  // weight so the percentage stays usable until they go live.
  const live = paths.filter((p) => !p.comingSoon);
  const totalWeight = live.reduce((s, p) => s + p.weight, 0) || 1;
  const grandPct =
    Math.round(
      (live.reduce((s, p) => s + (p.pct / 100) * p.weight, 0) / totalWeight) *
        1000,
    ) / 10;

  const byId = new Map(paths.map((p) => [p.id, p]));

  return {
    paths,
    kanaMastered: byId.get("kana")?.mastered ?? 0,
    kanjiMastered: byId.get("kanji")?.mastered ?? 0,
    vocabMastered: byId.get("vocab")?.mastered ?? 0,
    grandPct,
  };
}
