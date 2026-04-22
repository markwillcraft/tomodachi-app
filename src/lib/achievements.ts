import { prisma } from "./prisma";
import { getStreak } from "./streak";
import { MAX_SRS_LEVEL } from "./srs";

// =====================================================================
// Achievements / milestones
// ---------------------------------------------------------------------
// Stable catalog of one-time unlocks. Each achievement has a `kind` and
// a numeric `goal`; we compute a snapshot of the user's counters and
// unlock anything whose goal has been crossed. The list is versioned
// by id — renaming an id would make the achievement re-lock, so keep
// ids stable forever. New entries are append-only.
// =====================================================================

export type AchievementKind =
  | "streak_current"
  | "streak_longest"
  | "total_quizzes"
  | "total_questions"
  | "perfect_quizzes"
  | "coins_earned"
  | "cards_viewed"
  | "kanji_chars_seen"
  | "srs_mastered"
  | "kana_mastered"
  | "kanji_mastered"
  | "vocab_mastered"
  | "n5_grand";

export type AchievementCategory =
  | "streak"
  | "quiz"
  | "study"
  | "mastery"
  | "rewards"
  | "milestone";

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  kind: AchievementKind;
  goal: number;
  // Optional per-row label override — useful for the N5 grand to show
  // "Locked" instead of a literal 0/100 number on the progress bar.
  hideNumeric?: boolean;
};

// =====================================================================
// Catalog. Grouped by category for readability; the UI sections by
// category at render time.
// =====================================================================

const STREAK_CURRENT: AchievementDef[] = [
  { id: "streak_2", title: "Day two", description: "Reach a 2-day streak.", icon: "🔥", category: "streak", kind: "streak_current", goal: 2 },
  { id: "streak_3", title: "Getting into it", description: "Reach a 3-day streak.", icon: "🔥", category: "streak", kind: "streak_current", goal: 3 },
  { id: "streak_5", title: "On a roll", description: "Reach a 5-day streak.", icon: "🔥", category: "streak", kind: "streak_current", goal: 5 },
  { id: "streak_7", title: "One week strong", description: "Reach a 7-day streak.", icon: "🔥", category: "streak", kind: "streak_current", goal: 7 },
  { id: "streak_14", title: "Fortnight friend", description: "Reach a 14-day streak.", icon: "🔥", category: "streak", kind: "streak_current", goal: 14 },
  { id: "streak_21", title: "Habit forming", description: "Reach a 21-day streak.", icon: "🔥", category: "streak", kind: "streak_current", goal: 21 },
  { id: "streak_30", title: "Habit formed", description: "Reach a 30-day streak.", icon: "🏔️", category: "streak", kind: "streak_current", goal: 30 },
  { id: "streak_50", title: "Half-century", description: "Reach a 50-day streak.", icon: "🏔️", category: "streak", kind: "streak_current", goal: 50 },
  { id: "streak_75", title: "Discipline", description: "Reach a 75-day streak.", icon: "🏔️", category: "streak", kind: "streak_current", goal: 75 },
  { id: "streak_100", title: "Centurion", description: "Reach a 100-day streak.", icon: "💯", category: "streak", kind: "streak_current", goal: 100 },
  { id: "streak_180", title: "Half a year", description: "Reach a 180-day streak.", icon: "🌗", category: "streak", kind: "streak_current", goal: 180 },
  { id: "streak_365", title: "Year-long resolution", description: "Reach a 365-day streak.", icon: "🎂", category: "streak", kind: "streak_current", goal: 365 },
  { id: "streak_500", title: "Iron will", description: "Reach a 500-day streak.", icon: "⛩️", category: "streak", kind: "streak_current", goal: 500 },
  { id: "streak_1000", title: "Lifelong learner", description: "Reach a 1,000-day streak.", icon: "🐉", category: "streak", kind: "streak_current", goal: 1000 },
];

const STREAK_LONGEST: AchievementDef[] = [
  { id: "longest_5", title: "Personal best 5", description: "Hit a 5-day longest-ever streak.", icon: "📈", category: "streak", kind: "streak_longest", goal: 5 },
  { id: "longest_14", title: "Personal best 14", description: "Hit a 14-day longest-ever streak.", icon: "📈", category: "streak", kind: "streak_longest", goal: 14 },
  { id: "longest_30", title: "Personal best 30", description: "Hit a 30-day longest-ever streak.", icon: "📈", category: "streak", kind: "streak_longest", goal: 30 },
  { id: "longest_60", title: "Personal best 60", description: "Hit a 60-day longest-ever streak.", icon: "📈", category: "streak", kind: "streak_longest", goal: 60 },
  { id: "longest_100", title: "Personal best 100", description: "Hit a 100-day longest-ever streak.", icon: "🏔️", category: "streak", kind: "streak_longest", goal: 100 },
  { id: "longest_180", title: "Personal best 180", description: "Hit a 180-day longest-ever streak.", icon: "🏔️", category: "streak", kind: "streak_longest", goal: 180 },
  { id: "longest_365", title: "Personal best 365", description: "Hit a 365-day longest-ever streak.", icon: "🎂", category: "streak", kind: "streak_longest", goal: 365 },
];

const QUIZ_COUNT: AchievementDef[] = [
  { id: "quiz_first", title: "First attempt", description: "Complete your first quiz.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 1 },
  { id: "quiz_3", title: "Trifecta", description: "Complete 3 quizzes.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 3 },
  { id: "quiz_5", title: "Five down", description: "Complete 5 quizzes.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 5 },
  { id: "quiz_10", title: "Warmed up", description: "Complete 10 quizzes.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 10 },
  { id: "quiz_25", title: "Quiz regular", description: "Complete 25 quizzes.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 25 },
  { id: "quiz_50", title: "Drill sergeant", description: "Complete 50 quizzes.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 50 },
  { id: "quiz_75", title: "Battle-hardened", description: "Complete 75 quizzes.", icon: "🎯", category: "quiz", kind: "total_quizzes", goal: 75 },
  { id: "quiz_100", title: "Centurion of quizzes", description: "Complete 100 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 100 },
  { id: "quiz_150", title: "Quiz machine", description: "Complete 150 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 150 },
  { id: "quiz_200", title: "Quiz veteran", description: "Complete 200 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 200 },
  { id: "quiz_300", title: "Quiz fanatic", description: "Complete 300 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 300 },
  { id: "quiz_500", title: "Quiz champion", description: "Complete 500 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 500 },
  { id: "quiz_750", title: "Quiz legend", description: "Complete 750 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 750 },
  { id: "quiz_1000", title: "Quiz immortal", description: "Complete 1,000 quizzes.", icon: "🏆", category: "quiz", kind: "total_quizzes", goal: 1000 },
  { id: "quiz_2000", title: "Quiz overlord", description: "Complete 2,000 quizzes.", icon: "👑", category: "quiz", kind: "total_quizzes", goal: 2000 },
];

const QUESTION_COUNT: AchievementDef[] = [
  { id: "questions_25", title: "Getting started", description: "Answer 25 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 25 },
  { id: "questions_50", title: "Fifty answers", description: "Answer 50 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 50 },
  { id: "questions_100", title: "First hundred", description: "Answer 100 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 100 },
  { id: "questions_250", title: "Quarter-thousand", description: "Answer 250 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 250 },
  { id: "questions_500", title: "Five hundred strong", description: "Answer 500 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 500 },
  { id: "questions_1000", title: "Thousand-strong", description: "Answer 1,000 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 1000 },
  { id: "questions_2500", title: "Wordsmith", description: "Answer 2,500 quiz questions.", icon: "✏️", category: "quiz", kind: "total_questions", goal: 2500 },
  { id: "questions_5000", title: "Marathoner", description: "Answer 5,000 quiz questions.", icon: "🏃", category: "quiz", kind: "total_questions", goal: 5000 },
  { id: "questions_7500", title: "Ultra marathoner", description: "Answer 7,500 quiz questions.", icon: "🏃", category: "quiz", kind: "total_questions", goal: 7500 },
  { id: "questions_10000", title: "Five-figure mind", description: "Answer 10,000 quiz questions.", icon: "🧠", category: "quiz", kind: "total_questions", goal: 10000 },
  { id: "questions_25000", title: "Encyclopedia", description: "Answer 25,000 quiz questions.", icon: "📚", category: "quiz", kind: "total_questions", goal: 25000 },
  { id: "questions_50000", title: "Living dictionary", description: "Answer 50,000 quiz questions.", icon: "📖", category: "quiz", kind: "total_questions", goal: 50000 },
];

const PERFECT_QUIZZES: AchievementDef[] = [
  { id: "perfect_1", title: "No mistakes", description: "Score 100% on a quiz (min 5 questions).", icon: "💯", category: "quiz", kind: "perfect_quizzes", goal: 1 },
  { id: "perfect_3", title: "Triple perfect", description: "Score 100% on 3 quizzes.", icon: "💯", category: "quiz", kind: "perfect_quizzes", goal: 3 },
  { id: "perfect_5", title: "High five", description: "Score 100% on 5 quizzes.", icon: "💯", category: "quiz", kind: "perfect_quizzes", goal: 5 },
  { id: "perfect_10", title: "Perfectionist", description: "Score 100% on 10 quizzes.", icon: "💎", category: "quiz", kind: "perfect_quizzes", goal: 10 },
  { id: "perfect_25", title: "Sharp shooter", description: "Score 100% on 25 quizzes.", icon: "💎", category: "quiz", kind: "perfect_quizzes", goal: 25 },
  { id: "perfect_50", title: "Flawless fifty", description: "Score 100% on 50 quizzes.", icon: "💎", category: "quiz", kind: "perfect_quizzes", goal: 50 },
  { id: "perfect_100", title: "Untouchable", description: "Score 100% on 100 quizzes.", icon: "💠", category: "quiz", kind: "perfect_quizzes", goal: 100 },
  { id: "perfect_250", title: "Perfectly calibrated", description: "Score 100% on 250 quizzes.", icon: "💠", category: "quiz", kind: "perfect_quizzes", goal: 250 },
];

const CARDS_VIEWED: AchievementDef[] = [
  { id: "cards_10", title: "Card-curious", description: "Study 10 vocab cards.", icon: "🃏", category: "study", kind: "cards_viewed", goal: 10 },
  { id: "cards_25", title: "Card-comfortable", description: "Study 25 vocab cards.", icon: "🃏", category: "study", kind: "cards_viewed", goal: 25 },
  { id: "cards_50", title: "Card-fluent", description: "Study 50 vocab cards.", icon: "🃏", category: "study", kind: "cards_viewed", goal: 50 },
  { id: "cards_100", title: "Browser", description: "Study 100 vocab cards.", icon: "📖", category: "study", kind: "cards_viewed", goal: 100 },
  { id: "cards_250", title: "Reader", description: "Study 250 vocab cards.", icon: "📖", category: "study", kind: "cards_viewed", goal: 250 },
  { id: "cards_500", title: "Avid reader", description: "Study 500 vocab cards.", icon: "📖", category: "study", kind: "cards_viewed", goal: 500 },
  { id: "cards_1000", title: "Bookworm", description: "Study 1,000 vocab cards.", icon: "📚", category: "study", kind: "cards_viewed", goal: 1000 },
  { id: "cards_2500", title: "Library card", description: "Study 2,500 vocab cards.", icon: "📚", category: "study", kind: "cards_viewed", goal: 2500 },
  { id: "cards_5000", title: "Walking dictionary", description: "Study 5,000 vocab cards.", icon: "📚", category: "study", kind: "cards_viewed", goal: 5000 },
  { id: "cards_10000", title: "Card devotee", description: "Study 10,000 vocab cards.", icon: "🏛️", category: "study", kind: "cards_viewed", goal: 10000 },
];

const KANJI_SEEN: AchievementDef[] = [
  { id: "kanji_5", title: "First strokes", description: "See 5 unique N5 kanji in quizzes.", icon: "漢", category: "study", kind: "kanji_chars_seen", goal: 5 },
  { id: "kanji_10", title: "Ten kanji", description: "See 10 unique N5 kanji in quizzes.", icon: "漢", category: "study", kind: "kanji_chars_seen", goal: 10 },
  { id: "kanji_25", title: "Kanji curious", description: "See 25 unique N5 kanji in quizzes.", icon: "漢", category: "study", kind: "kanji_chars_seen", goal: 25 },
  { id: "kanji_50", title: "Half the set", description: "See 50 unique N5 kanji in quizzes.", icon: "漢", category: "study", kind: "kanji_chars_seen", goal: 50 },
  { id: "kanji_75", title: "Three quarters", description: "See 75 unique N5 kanji in quizzes.", icon: "漢", category: "study", kind: "kanji_chars_seen", goal: 75 },
  { id: "kanji_all", title: "N5 explorer", description: "Face all 100 N5 kanji at least once.", icon: "🗾", category: "study", kind: "kanji_chars_seen", goal: 100 },
];

const SRS_MASTERED: AchievementDef[] = [
  { id: "mastered_1", title: "First lock-in", description: "Master your first item (any type).", icon: "🔐", category: "mastery", kind: "srs_mastered", goal: 1 },
  { id: "mastered_5", title: "Locked & loaded", description: "Master 5 items.", icon: "🔐", category: "mastery", kind: "srs_mastered", goal: 5 },
  { id: "mastered_10", title: "Locked in", description: "Master 10 items (SRS level 6).", icon: "🧠", category: "mastery", kind: "srs_mastered", goal: 10 },
  { id: "mastered_25", title: "Memory bank", description: "Master 25 items.", icon: "🧠", category: "mastery", kind: "srs_mastered", goal: 25 },
  { id: "mastered_50", title: "Long-term memory", description: "Master 50 items.", icon: "🧠", category: "mastery", kind: "srs_mastered", goal: 50 },
  { id: "mastered_100", title: "Triple digits", description: "Master 100 items.", icon: "🧠", category: "mastery", kind: "srs_mastered", goal: 100 },
  { id: "mastered_200", title: "Fluent fundamentals", description: "Master 200 items.", icon: "🌸", category: "mastery", kind: "srs_mastered", goal: 200 },
  { id: "mastered_500", title: "Vault keeper", description: "Master 500 items.", icon: "🌸", category: "mastery", kind: "srs_mastered", goal: 500 },
  { id: "mastered_1000", title: "Mind palace", description: "Master 1,000 items.", icon: "🏯", category: "mastery", kind: "srs_mastered", goal: 1000 },
];

// Mastery is per-type so the path to N5 grand is legible even partway
// through. Goals are tuned to actual seed sizes: ~71 hiragana + 71
// katakana = 142 kana, 100 N5 kanji, ~600+ vocab. We pick reasonable
// "you've actually internalized this" thresholds, not full coverage.
const KANA_MASTERED: AchievementDef[] = [
  { id: "kana_master_5", title: "Kana spark", description: "Master 5 kana characters.", icon: "あ", category: "mastery", kind: "kana_mastered", goal: 5 },
  { id: "kana_master_10", title: "Kana steps", description: "Master 10 kana characters.", icon: "あ", category: "mastery", kind: "kana_mastered", goal: 10 },
  { id: "kana_master_25", title: "Kana confident", description: "Master 25 kana characters.", icon: "あ", category: "mastery", kind: "kana_mastered", goal: 25 },
  { id: "kana_master_46", title: "Hiragana fluent", description: "Master 46 kana characters (a full gojuon).", icon: "ひ", category: "mastery", kind: "kana_mastered", goal: 46 },
  { id: "kana_master_71", title: "Hiragana complete", description: "Master 71 kana (full hiragana table).", icon: "ぱ", category: "mastery", kind: "kana_mastered", goal: 71 },
  { id: "kana_master_100", title: "Bilingual reader", description: "Master 100 kana across both syllabaries.", icon: "カ", category: "mastery", kind: "kana_mastered", goal: 100 },
];

const KANJI_MASTERED: AchievementDef[] = [
  { id: "kanji_master_1", title: "First kanji", description: "Master your first kanji.", icon: "一", category: "mastery", kind: "kanji_mastered", goal: 1 },
  { id: "kanji_master_5", title: "Five locked in", description: "Master 5 kanji.", icon: "五", category: "mastery", kind: "kanji_mastered", goal: 5 },
  { id: "kanji_master_10", title: "Ten kanji owned", description: "Master 10 kanji.", icon: "十", category: "mastery", kind: "kanji_mastered", goal: 10 },
  { id: "kanji_master_25", title: "Quarter mastery", description: "Master 25 N5 kanji.", icon: "漢", category: "mastery", kind: "kanji_mastered", goal: 25 },
  { id: "kanji_master_50", title: "Halfway home", description: "Master 50 N5 kanji.", icon: "漢", category: "mastery", kind: "kanji_mastered", goal: 50 },
  { id: "kanji_master_75", title: "Three quarters mastered", description: "Master 75 N5 kanji.", icon: "漢", category: "mastery", kind: "kanji_mastered", goal: 75 },
  { id: "kanji_master_100", title: "All N5 kanji", description: "Master all 100 N5 kanji.", icon: "🗾", category: "mastery", kind: "kanji_mastered", goal: 100 },
];

const VOCAB_MASTERED: AchievementDef[] = [
  { id: "vocab_master_5", title: "Vocab seedling", description: "Master 5 vocab words.", icon: "🌱", category: "mastery", kind: "vocab_mastered", goal: 5 },
  { id: "vocab_master_10", title: "Vocab sprout", description: "Master 10 vocab words.", icon: "🌱", category: "mastery", kind: "vocab_mastered", goal: 10 },
  { id: "vocab_master_25", title: "Vocab garden", description: "Master 25 vocab words.", icon: "🌿", category: "mastery", kind: "vocab_mastered", goal: 25 },
  { id: "vocab_master_50", title: "Vocab grove", description: "Master 50 vocab words.", icon: "🌿", category: "mastery", kind: "vocab_mastered", goal: 50 },
  { id: "vocab_master_100", title: "Vocab forest", description: "Master 100 vocab words.", icon: "🌳", category: "mastery", kind: "vocab_mastered", goal: 100 },
  { id: "vocab_master_200", title: "Vocab arboretum", description: "Master 200 vocab words.", icon: "🌳", category: "mastery", kind: "vocab_mastered", goal: 200 },
  { id: "vocab_master_500", title: "Vocab old growth", description: "Master 500 vocab words.", icon: "🎋", category: "mastery", kind: "vocab_mastered", goal: 500 },
];

const COINS: AchievementDef[] = [
  { id: "coins_50", title: "First coins", description: "Earn 50 coins.", icon: "🪙", category: "rewards", kind: "coins_earned", goal: 50 },
  { id: "coins_100", title: "Pocket change", description: "Earn 100 coins.", icon: "🪙", category: "rewards", kind: "coins_earned", goal: 100 },
  { id: "coins_250", title: "Coin counter", description: "Earn 250 coins.", icon: "🪙", category: "rewards", kind: "coins_earned", goal: 250 },
  { id: "coins_500", title: "Pocket money", description: "Earn 500 coins.", icon: "🪙", category: "rewards", kind: "coins_earned", goal: 500 },
  { id: "coins_1000", title: "Wallet warmer", description: "Earn 1,000 coins.", icon: "💰", category: "rewards", kind: "coins_earned", goal: 1000 },
  { id: "coins_2500", title: "Heavy pockets", description: "Earn 2,500 coins.", icon: "💰", category: "rewards", kind: "coins_earned", goal: 2500 },
  { id: "coins_5000", title: "Coin hoarder", description: "Earn 5,000 coins.", icon: "💰", category: "rewards", kind: "coins_earned", goal: 5000 },
  { id: "coins_10000", title: "Tomodachi whale", description: "Earn 10,000 coins.", icon: "🏦", category: "rewards", kind: "coins_earned", goal: 10000 },
  { id: "coins_25000", title: "Vault opener", description: "Earn 25,000 coins.", icon: "🏦", category: "rewards", kind: "coins_earned", goal: 25000 },
  { id: "coins_50000", title: "Treasury", description: "Earn 50,000 coins.", icon: "🏦", category: "rewards", kind: "coins_earned", goal: 50000 },
  { id: "coins_100000", title: "Six figures", description: "Earn 100,000 coins.", icon: "🏯", category: "rewards", kind: "coins_earned", goal: 100000 },
];

// The grand prize. Goal is 100 (matches the percentage progress
// formula in `computeCounters` for `n5_grand`) so the bar fills up
// continuously across the entire N5 path.
const N5_GRAND: AchievementDef[] = [
  {
    id: "n5_master",
    title: "N5 Master",
    description:
      "Master all 100 N5 kanji, 80+ kana, and 200+ vocab — the full N5 toolkit.",
    icon: "⛩️",
    category: "milestone",
    kind: "n5_grand",
    goal: 100,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...STREAK_CURRENT,
  ...STREAK_LONGEST,
  ...QUIZ_COUNT,
  ...QUESTION_COUNT,
  ...PERFECT_QUIZZES,
  ...CARDS_VIEWED,
  ...KANJI_SEEN,
  ...SRS_MASTERED,
  ...KANA_MASTERED,
  ...KANJI_MASTERED,
  ...VOCAB_MASTERED,
  ...COINS,
  ...N5_GRAND,
];

// Targets used by the N5 grand counter. Exposed so the progress card
// on /achievements can render a breakdown without re-deriving them.
export const N5_TARGETS = {
  kanji: 100,
  kana: 80,
  vocab: 200,
} as const;

export type AchievementProgress = AchievementDef & {
  unlocked: boolean;
  unlockedAt: Date | null;
  current: number;
  pct: number;
};

export type AchievementCounters = {
  streakCurrent: number;
  streakLongest: number;
  totalQuizzes: number;
  totalQuestions: number;
  perfectQuizzes: number;
  coinsEarned: number;
  cardsViewed: number;
  kanjiCharsSeen: number;
  srsMastered: number;
  kanaMastered: number;
  kanjiMastered: number;
  vocabMastered: number;
  // 0..100 — scaled progress toward the N5 grand achievement so the
  // progress bar fills continuously as the user closes the gap.
  n5Grand: number;
};

async function computeCounters(userId: string): Promise<AchievementCounters> {
  // A "perfect" quiz has to be at least this long so a 1-question 100%
  // doesn't unlock the achievement. Matches COIN_RULES.quizMinTotalForBonus.
  const PERFECT_MIN = 5;
  const [
    streak,
    totalQuizzes,
    totalQuestions,
    perfectCandidates,
    coinsAgg,
    cardsViewed,
    kanjiSeenRows,
    meaningToKanjiRows,
    masteredByType,
  ] = await Promise.all([
    getStreak(userId),
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.questionResult.count({ where: { attempt: { userId } } }),
    // Column-vs-column compare (correct === total) isn't expressible in
    // a Prisma `where`, so we pull the small shortlist of long-enough
    // attempts and filter in memory. "Long enough" is a tiny slice of
    // the table in practice.
    prisma.quizAttempt.findMany({
      where: { userId, total: { gte: PERFECT_MIN } },
      select: { total: true, correct: true },
    }),
    prisma.coinLedger.aggregate({
      where: { userId, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.cardView.count({ where: { userId } }),
    // Distinct characters seen via "kanji_to_*" questions. Their prompt
    // *is* the kanji character.
    prisma.questionResult.findMany({
      where: {
        attempt: { userId },
        kind: { in: ["kanji_to_meaning", "kanji_to_reading"] },
      },
      select: { prompt: true },
      distinct: ["prompt"],
    }),
    // "meaning_to_kanji" reverses the mapping — we want distinct
    // *correct* values (the kanji char) here.
    prisma.questionResult.findMany({
      where: { attempt: { userId }, kind: "meaning_to_kanji" },
      select: { correct: true },
      distinct: ["correct"],
    }),
    // One groupBy gives us mastery counts per item type in a single
    // round trip — cheaper than three separate counts.
    prisma.reviewState.groupBy({
      by: ["itemType"],
      where: { userId, level: { gte: MAX_SRS_LEVEL } },
      _count: { _all: true },
    }),
  ]);

  const perfectQuizzes = perfectCandidates.filter(
    (a) => a.correct === a.total,
  ).length;
  const kanjiSeenChars = new Set(kanjiSeenRows.map((r) => r.prompt));
  for (const r of meaningToKanjiRows) kanjiSeenChars.add(r.correct);

  let kanaMastered = 0;
  let kanjiMastered = 0;
  let vocabMastered = 0;
  for (const row of masteredByType) {
    if (row.itemType === "kana") kanaMastered = row._count._all;
    else if (row.itemType === "kanji") kanjiMastered = row._count._all;
    else if (row.itemType === "vocab") vocabMastered = row._count._all;
  }
  const srsMastered = kanaMastered + kanjiMastered + vocabMastered;

  // Linear blend of the three N5 mastery axes. Each axis caps at 100%
  // so an over-mastered axis doesn't paper over a weak one, and the
  // overall average reaches 100 only when *all three* are met.
  const kanjiPct = Math.min(1, kanjiMastered / N5_TARGETS.kanji);
  const kanaPct = Math.min(1, kanaMastered / N5_TARGETS.kana);
  const vocabPct = Math.min(1, vocabMastered / N5_TARGETS.vocab);
  const n5Grand = Math.round(((kanjiPct + kanaPct + vocabPct) / 3) * 100);

  return {
    streakCurrent: streak.current,
    streakLongest: streak.longest,
    totalQuizzes,
    totalQuestions,
    perfectQuizzes,
    coinsEarned: coinsAgg._sum.amount ?? 0,
    cardsViewed,
    kanjiCharsSeen: kanjiSeenChars.size,
    srsMastered,
    kanaMastered,
    kanjiMastered,
    vocabMastered,
    n5Grand,
  };
}

function counterFor(
  kind: AchievementKind,
  counters: AchievementCounters,
): number {
  switch (kind) {
    case "streak_current":
      return counters.streakCurrent;
    case "streak_longest":
      return counters.streakLongest;
    case "total_quizzes":
      return counters.totalQuizzes;
    case "total_questions":
      return counters.totalQuestions;
    case "perfect_quizzes":
      return counters.perfectQuizzes;
    case "coins_earned":
      return counters.coinsEarned;
    case "cards_viewed":
      return counters.cardsViewed;
    case "kanji_chars_seen":
      return counters.kanjiCharsSeen;
    case "srs_mastered":
      return counters.srsMastered;
    case "kana_mastered":
      return counters.kanaMastered;
    case "kanji_mastered":
      return counters.kanjiMastered;
    case "vocab_mastered":
      return counters.vocabMastered;
    case "n5_grand":
      return counters.n5Grand;
  }
}

export type UnlockedAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

// Check every catalog entry against the user's current counters and
// insert a row for anything newly crossed. Returns the catalog entries
// that were *just* unlocked (empty if nothing new) so the caller can
// celebrate them. Safe to call from any surface: the unique constraint
// on (userId, achievementId) deduplicates.
export async function evaluateAchievements(
  userId: string,
): Promise<UnlockedAchievement[]> {
  const [counters, existing] = await Promise.all([
    computeCounters(userId),
    prisma.achievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
  ]);
  const already = new Set(existing.map((e) => e.achievementId));
  const toUnlock: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (already.has(def.id)) continue;
    if (counterFor(def.kind, counters) >= def.goal) toUnlock.push(def);
  }
  if (toUnlock.length === 0) return [];

  // Try to insert each; tolerate the (userId, achievementId) unique
  // clash in case a parallel request just beat us to it.
  const newly: UnlockedAchievement[] = [];
  for (const def of toUnlock) {
    try {
      await prisma.achievement.create({
        data: { userId, achievementId: def.id },
      });
      newly.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
      });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
  return newly;
}

export type N5Snapshot = {
  kanji: { current: number; target: number };
  kana: { current: number; target: number };
  vocab: { current: number; target: number };
  pct: number;
};

export type AchievementsSnapshot = {
  items: AchievementProgress[];
  unlockedCount: number;
  totalCount: number;
  n5: N5Snapshot;
};

// Full read for the /achievements page: every catalog entry paired
// with unlock status and progress toward its goal. Self-heals by
// running evaluateAchievements first so a fresh visit can never
// display crossed-but-locked entries (which used to happen because
// the layout fired evaluation and-forget).
export async function getAchievementsProgress(
  userId: string,
): Promise<AchievementsSnapshot> {
  await evaluateAchievements(userId);
  const [counters, existing] = await Promise.all([
    computeCounters(userId),
    prisma.achievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    }),
  ]);
  const unlockedMap = new Map(
    existing.map((e) => [e.achievementId, e.unlockedAt]),
  );
  const items: AchievementProgress[] = ACHIEVEMENTS.map((def) => {
    const current = counterFor(def.kind, counters);
    const unlockedAt = unlockedMap.get(def.id) ?? null;
    const capped = Math.min(current, def.goal);
    return {
      ...def,
      current,
      unlocked: Boolean(unlockedAt),
      unlockedAt,
      pct: def.goal === 0 ? 0 : Math.round((capped / def.goal) * 100),
    };
  });
  return {
    items,
    unlockedCount: existing.length,
    totalCount: ACHIEVEMENTS.length,
    n5: {
      kanji: { current: counters.kanjiMastered, target: N5_TARGETS.kanji },
      kana: { current: counters.kanaMastered, target: N5_TARGETS.kana },
      vocab: { current: counters.vocabMastered, target: N5_TARGETS.vocab },
      pct: counters.n5Grand,
    },
  };
}
