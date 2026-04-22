import { prisma } from "./prisma";

// =====================================================================
// Coin economy
// ---------------------------------------------------------------------
// Single source of truth for what every action is worth and what the
// daily quests require. Tweaking the values here is enough to retune the
// whole system — every endpoint reads from these constants.
// =====================================================================

// Per-action rewards (granted on successful completion).
export const COIN_RULES = {
  // Quizzes
  quizBase: 5,
  quizPerCorrect: 1,
  quizHighAccuracyBonus: 10, // >= 90% accuracy
  quizPerfectBonus: 20, // 100% accuracy (stacks with the high-accuracy bonus)
  quizMinTotalForBonus: 5, // bonuses only kick in for non-trivial quizzes

  // Vocab card studied (StudyCard flip)
  cardView: 1,
  cardViewDailyCap: 50,

  // Kanji studied
  kanjiView: 1,
  kanjiViewDailyCap: 50,

  // Kana muscle-memory drill
  kanaDrillBase: 5,
  kanaDrillPerCorrect: 1,
  kanaDrillPerfectBonus: 20,
  kanaDrillMinForBonus: 10,
} as const;

// =====================================================================
// Daily quests
// ---------------------------------------------------------------------
// Higher-value milestones that reset every UTC day. Each quest has a
// stable id so we can dedup the reward in the ledger as
// "quest:<utcDate>:<id>". Targets reuse the existing streak goals when
// possible so quests, streak, and dashboards all agree.
// =====================================================================

export const DAILY_QUEST_DEFS = [
  {
    id: "first_quiz",
    title: "Take a quiz",
    description: "Complete any quiz today",
    target: 1,
    reward: 25,
  },
  {
    id: "answer_50_questions",
    title: "Answer 50 quiz questions",
    description: "Across any number of quizzes",
    target: 50,
    reward: 50,
  },
  {
    id: "study_50_cards",
    title: "Study 50 vocab cards",
    description: "Flip through your library",
    target: 50,
    reward: 50,
  },
  {
    id: "score_90_quiz",
    title: "Ace a quiz",
    description: "Score 90% or higher on any quiz",
    target: 1,
    reward: 30,
  },
  {
    id: "all_quests",
    title: "Complete every quest",
    description: "Capstone bonus for finishing the daily list",
    target: 1,
    reward: 100,
  },
] as const;

export type DailyQuestId = (typeof DAILY_QUEST_DEFS)[number]["id"];

export type DailyQuest = {
  id: DailyQuestId;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
};

// =====================================================================
// Helpers
// =====================================================================

export function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function utcMidnight(d: Date = new Date()): Date {
  const m = new Date(d);
  m.setUTCHours(0, 0, 0, 0);
  return m;
}

export function nextUtcMidnight(d: Date = new Date()): Date {
  const m = utcMidnight(d);
  m.setUTCDate(m.getUTCDate() + 1);
  return m;
}

// =====================================================================
// Ledger writes
// ---------------------------------------------------------------------
// Idempotent: same dedupKey → no duplicate row, returns 0 earned. The
// caller can ignore the `ok` flag if it doesn't care, or use it to
// surface a "+coins" toast only when something was actually granted.
// =====================================================================

export async function awardCoins(
  userId: string,
  amount: number,
  reason: string,
  dedupKey: string,
): Promise<{ awarded: boolean; amount: number }> {
  if (amount <= 0) return { awarded: false, amount: 0 };
  try {
    await prisma.coinLedger.create({
      data: { userId, amount, reason, dedupKey },
    });
    return { awarded: true, amount };
  } catch (err) {
    // P2002 = unique constraint violation → already awarded; that's fine.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { awarded: false, amount: 0 };
    }
    throw err;
  }
}

// =====================================================================
// Reads
// =====================================================================

export async function getCoinBalance(userId: string): Promise<number> {
  const agg = await prisma.coinLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

export async function getEarnedToday(userId: string): Promise<number> {
  const since = utcMidnight();
  const agg = await prisma.coinLedger.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

export type CoinSummary = {
  balance: number;
  earnedToday: number;
  resetsAt: string; // ISO string of next UTC midnight
};

export async function getCoinSummary(userId: string): Promise<CoinSummary> {
  const [balance, earnedToday] = await Promise.all([
    getCoinBalance(userId),
    getEarnedToday(userId),
  ]);
  return {
    balance,
    earnedToday,
    resetsAt: nextUtcMidnight().toISOString(),
  };
}

// =====================================================================
// Daily quest evaluation
// ---------------------------------------------------------------------
// Called after any activity that could move the needle on a quest. We
// recompute today's progress from source-of-truth tables (quizzes,
// card views, ledger), then for any quest that's now complete and not
// yet claimed, we write the reward row. The unique ledger key makes
// this safe to call from multiple endpoints concurrently.
// =====================================================================

type QuestProgress = {
  firstQuizCount: number;
  questionsAnswered: number;
  cardsStudied: number;
  best90: boolean;
};

async function computeProgress(userId: string): Promise<QuestProgress> {
  const since = utcMidnight();
  const [attempts, cards] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { total: true, correct: true },
    }),
    prisma.cardView.count({
      where: { userId, createdAt: { gte: since } },
    }),
  ]);

  const firstQuizCount = attempts.length;
  const questionsAnswered = attempts.reduce((s, a) => s + a.total, 0);
  // Quizzes shorter than min count don't qualify for the "ace" quest so a
  // user can't game the system with a 1-question quiz they ace.
  const best90 = attempts.some(
    (a) =>
      a.total >= COIN_RULES.quizMinTotalForBonus &&
      a.correct / a.total >= 0.9,
  );
  return {
    firstQuizCount,
    questionsAnswered,
    cardsStudied: cards,
    best90,
  };
}

function buildQuests(
  progress: QuestProgress,
  claimed: Set<string>,
): DailyQuest[] {
  const quests: DailyQuest[] = DAILY_QUEST_DEFS.slice(0, -1).map((def) => {
    let current = 0;
    if (def.id === "first_quiz") current = progress.firstQuizCount;
    else if (def.id === "answer_50_questions")
      current = progress.questionsAnswered;
    else if (def.id === "study_50_cards") current = progress.cardsStudied;
    else if (def.id === "score_90_quiz") current = progress.best90 ? 1 : 0;
    const cappedCurrent = Math.min(current, def.target);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      target: def.target,
      current: cappedCurrent,
      reward: def.reward,
      completed: cappedCurrent >= def.target,
      claimed: claimed.has(def.id),
    };
  });
  // Capstone: depends on every other quest being completed.
  const allDone = quests.every((q) => q.completed);
  const capDef = DAILY_QUEST_DEFS[DAILY_QUEST_DEFS.length - 1];
  quests.push({
    id: capDef.id,
    title: capDef.title,
    description: capDef.description,
    target: capDef.target,
    current: allDone ? 1 : 0,
    reward: capDef.reward,
    completed: allDone,
    claimed: claimed.has(capDef.id),
  });
  return quests;
}

export async function getDailyQuests(userId: string): Promise<DailyQuest[]> {
  const day = utcDayKey();
  const [progress, ledger] = await Promise.all([
    computeProgress(userId),
    prisma.coinLedger.findMany({
      where: { userId, dedupKey: { startsWith: `quest:${day}:` } },
      select: { dedupKey: true },
    }),
  ]);
  const claimed = new Set(
    ledger.map((row) => row.dedupKey.replace(`quest:${day}:`, "")),
  );
  return buildQuests(progress, claimed);
}

// Award any newly-completed quests for today. Returns a list of
// { id, reward } pairs that were *just* claimed (empty if nothing new).
export async function claimEligibleQuests(
  userId: string,
): Promise<Array<{ id: DailyQuestId; reward: number }>> {
  const day = utcDayKey();
  const quests = await getDailyQuests(userId);
  const newlyClaimed: Array<{ id: DailyQuestId; reward: number }> = [];
  for (const q of quests) {
    if (!q.completed || q.claimed) continue;
    const result = await awardCoins(
      userId,
      q.reward,
      `quest_${q.id}`,
      `quest:${day}:${q.id}`,
    );
    if (result.awarded) {
      newlyClaimed.push({ id: q.id, reward: q.reward });
    }
  }
  return newlyClaimed;
}

// =====================================================================
// High-level award helpers
// ---------------------------------------------------------------------
// One call per activity. Each computes the action reward, writes it,
// then re-evaluates daily quests so quest bonuses fall out automatically.
// Returns total coins earned in this call so the client can render a
// "+N coins" celebration.
// =====================================================================

export type CoinAwardSummary = {
  earned: number;
  reasons: Array<{ reason: string; amount: number }>;
};

function pushReason(out: CoinAwardSummary, reason: string, amount: number) {
  if (amount <= 0) return;
  out.earned += amount;
  out.reasons.push({ reason, amount });
}

export async function awardForQuiz(
  userId: string,
  attemptId: number,
  total: number,
  correct: number,
): Promise<CoinAwardSummary> {
  const out: CoinAwardSummary = { earned: 0, reasons: [] };
  const base =
    COIN_RULES.quizBase + correct * COIN_RULES.quizPerCorrect;
  const baseRes = await awardCoins(
    userId,
    base,
    "quiz_complete",
    `quiz:${attemptId}`,
  );
  if (baseRes.awarded) pushReason(out, "Quiz complete", base);

  // Bonuses gated to non-trivial quizzes so a 1-question 100% doesn't
  // earn the +30 bonus.
  if (total >= COIN_RULES.quizMinTotalForBonus) {
    const accuracy = correct / total;
    if (accuracy >= 0.9) {
      const r = await awardCoins(
        userId,
        COIN_RULES.quizHighAccuracyBonus,
        "quiz_high_accuracy",
        `quiz:${attemptId}:hi`,
      );
      if (r.awarded)
        pushReason(out, "90%+ accuracy bonus", COIN_RULES.quizHighAccuracyBonus);
    }
    if (correct === total) {
      const r = await awardCoins(
        userId,
        COIN_RULES.quizPerfectBonus,
        "quiz_perfect",
        `quiz:${attemptId}:pf`,
      );
      if (r.awarded)
        pushReason(out, "Perfect score bonus", COIN_RULES.quizPerfectBonus);
    }
  }

  // After any per-action grant, see if a daily quest just clicked over.
  const quests = await claimEligibleQuests(userId);
  for (const q of quests) {
    pushReason(out, `Quest: ${q.id}`, q.reward);
  }
  return out;
}

export async function awardForCardView(
  userId: string,
  cardViewId: number,
): Promise<CoinAwardSummary> {
  const out: CoinAwardSummary = { earned: 0, reasons: [] };
  // Cap per day: count today's card-view rewards in the ledger.
  const today = utcMidnight();
  const grantedToday = await prisma.coinLedger.count({
    where: {
      userId,
      reason: "card_view",
      createdAt: { gte: today },
    },
  });
  if (grantedToday < COIN_RULES.cardViewDailyCap) {
    const r = await awardCoins(
      userId,
      COIN_RULES.cardView,
      "card_view",
      `card:${cardViewId}`,
    );
    if (r.awarded) pushReason(out, "Card studied", COIN_RULES.cardView);
  }
  const quests = await claimEligibleQuests(userId);
  for (const q of quests) pushReason(out, `Quest: ${q.id}`, q.reward);
  return out;
}

export async function awardForKanjiView(
  userId: string,
  kanjiViewId: number,
): Promise<CoinAwardSummary> {
  const out: CoinAwardSummary = { earned: 0, reasons: [] };
  const today = utcMidnight();
  const grantedToday = await prisma.coinLedger.count({
    where: {
      userId,
      reason: "kanji_view",
      createdAt: { gte: today },
    },
  });
  if (grantedToday < COIN_RULES.kanjiViewDailyCap) {
    const r = await awardCoins(
      userId,
      COIN_RULES.kanjiView,
      "kanji_view",
      `kanji:${kanjiViewId}`,
    );
    if (r.awarded) pushReason(out, "Kanji studied", COIN_RULES.kanjiView);
  }
  const quests = await claimEligibleQuests(userId);
  for (const q of quests) pushReason(out, `Quest: ${q.id}`, q.reward);
  return out;
}

// =====================================================================
// Retroactive reconciliation
// ---------------------------------------------------------------------
// Fires every page load. Walks today's activity tables (quiz attempts,
// card views, kanji views) and mints any ledger entries that are
// missing — useful when the coin feature is first enabled mid-day or
// any time an award write was dropped. Because every grant is keyed by
// (userId, dedupKey), re-running this is idempotent and the fast path
// short-circuits once the ledger catches up to activity count.
// =====================================================================
export async function syncTodaysCoins(userId: string): Promise<void> {
  const since = utcMidnight();
  const [attempts, cards, kanjis, ledgerCount] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { id: true, total: true, correct: true },
    }),
    prisma.cardView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.kanjiView.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.coinLedger.count({
      where: { userId, createdAt: { gte: since } },
    }),
  ]);

  const activityCount = attempts.length + cards.length + kanjis.length;
  // Ledger entries per activity are 1+ (per-action) plus bonuses and
  // quests. Once ledgerCount >= activityCount we're reconciled — skip
  // all the per-action backfill and only re-run the quest claim in case
  // the user just crossed a threshold on this very page load.
  if (activityCount === 0 || ledgerCount >= activityCount) {
    await claimEligibleQuests(userId);
    return;
  }

  // Quiz backfill (base + bonuses).
  for (const a of attempts) {
    const base = COIN_RULES.quizBase + a.correct * COIN_RULES.quizPerCorrect;
    await awardCoins(userId, base, "quiz_complete", `quiz:${a.id}`);
    if (a.total >= COIN_RULES.quizMinTotalForBonus) {
      const accuracy = a.correct / a.total;
      if (accuracy >= 0.9) {
        await awardCoins(
          userId,
          COIN_RULES.quizHighAccuracyBonus,
          "quiz_high_accuracy",
          `quiz:${a.id}:hi`,
        );
      }
      if (a.correct === a.total) {
        await awardCoins(
          userId,
          COIN_RULES.quizPerfectBonus,
          "quiz_perfect",
          `quiz:${a.id}:pf`,
        );
      }
    }
  }

  // Card-view backfill, respecting the daily cap.
  let cardsAwarded = await prisma.coinLedger.count({
    where: { userId, reason: "card_view", createdAt: { gte: since } },
  });
  for (const c of cards) {
    if (cardsAwarded >= COIN_RULES.cardViewDailyCap) break;
    const r = await awardCoins(
      userId,
      COIN_RULES.cardView,
      "card_view",
      `card:${c.id}`,
    );
    if (r.awarded) cardsAwarded += 1;
  }

  // Kanji-view backfill, respecting the daily cap.
  let kanjisAwarded = await prisma.coinLedger.count({
    where: { userId, reason: "kanji_view", createdAt: { gte: since } },
  });
  for (const k of kanjis) {
    if (kanjisAwarded >= COIN_RULES.kanjiViewDailyCap) break;
    const r = await awardCoins(
      userId,
      COIN_RULES.kanjiView,
      "kanji_view",
      `kanji:${k.id}`,
    );
    if (r.awarded) kanjisAwarded += 1;
  }

  // Finally, claim any newly-complete quests.
  await claimEligibleQuests(userId);
}

// Kana muscle-memory drill is purely client-side, so the client posts a
// completion record and we mint coins from it. We use a stable client-
// generated key (UUID) so a network retry doesn't double-pay.
export async function awardForKanaDrill(
  userId: string,
  drillKey: string,
  total: number,
  correct: number,
): Promise<CoinAwardSummary> {
  const out: CoinAwardSummary = { earned: 0, reasons: [] };
  const base =
    COIN_RULES.kanaDrillBase + correct * COIN_RULES.kanaDrillPerCorrect;
  const baseRes = await awardCoins(
    userId,
    base,
    "kana_drill_complete",
    `kana:${drillKey}`,
  );
  if (baseRes.awarded) pushReason(out, "Kana drill complete", base);

  if (total >= COIN_RULES.kanaDrillMinForBonus && correct === total) {
    const r = await awardCoins(
      userId,
      COIN_RULES.kanaDrillPerfectBonus,
      "kana_drill_perfect",
      `kana:${drillKey}:pf`,
    );
    if (r.awarded)
      pushReason(out, "Perfect drill bonus", COIN_RULES.kanaDrillPerfectBonus);
  }

  const quests = await claimEligibleQuests(userId);
  for (const q of quests) pushReason(out, `Quest: ${q.id}`, q.reward);
  return out;
}
