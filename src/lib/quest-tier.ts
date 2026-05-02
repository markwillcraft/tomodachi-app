import "server-only";

import {
  classifyQuestTier,
  type QuestTierClassification,
  type WeeklyEngagementForAI,
} from "./gemini";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import {
  emptyWeeklyEngagement,
  getWeeklyEngagement,
  type WeeklyEngagement,
} from "./weekly-engagement";

// =====================================================================
// Quest tier classifier
// ---------------------------------------------------------------------
// Picks a `(tier, focus)` pair for the user's progressive daily-quest
// resolver. Tier scales TARGETS, focus rotates the SET.
//
// Two paths feed the same shape; the resolver in `coins.ts` doesn't
// care which one produced the row:
//
//   1. AI path — Gemini's `classifyQuestTier()` reads a small weekly
//      activity snapshot and returns a JSON `{tier, focus}`. Capped to
//      one call per user per *week* via the `validUntil` TTL on
//      UserQuestTier; further capped per-minute by the `ai` rate-limit
//      bucket.
//
//   2. Rule fallback — deterministic thresholds on the same snapshot.
//      Always available even when GEMINI_API_KEY is unset, Upstash is
//      down, or the AI bucket is exhausted. The thresholds intentionally
//      mirror the AI prompt's tier vocabulary so behaviour is consistent
//      across paths.
//
// `getOrComputeUserQuestTier()` is the single entry point. It hits the
// DB at most twice (read + upsert) and the LLM at most once per week
// per user.
// =====================================================================

export type QuestTier = QuestTierClassification["tier"];
export type QuestFocus = QuestTierClassification["focus"];

export type ResolvedTier = {
  userId: string;
  tier: QuestTier;
  focus: QuestFocus;
  source: "ai" | "rule_fallback";
  computedAt: Date;
  validUntil: Date;
  signals: WeeklyEngagement;
};

const TIER_TTL_MS = 7 * 24 * 3600_000;

// Minimum activity floor below which we don't even ask the LLM —
// brand-new users default to "starter" / "balanced" instantly. Keeps
// our LLM bill from being charged for a 14-zero JSON snapshot.
const MIN_ACTIVITY_FOR_AI = 10;

function pickWeeklyForAI(s: WeeklyEngagement): WeeklyEngagementForAI {
  return {
    quizAnswered: s.quizAnswered,
    quizAccuracy: s.quizAccuracy,
    quizAttempts: s.quizAttempts,
    cardsViewed: s.cardsViewed,
    kanjiViewed: s.kanjiViewed,
    kanaReadingSessions: s.kanaReadingSessions,
    kanaDrillSessions: s.kanaDrillSessions,
    dojoSectionsPassed: s.dojoSectionsPassed,
    activeDays: s.activeDays,
  };
}

function totalActivityScore(s: WeeklyEngagement): number {
  // Coarse "did anything happen this week" signal. Quiz Qs dominate
  // because they're the densest activity; everything else just nudges.
  return (
    s.quizAnswered +
    s.cardsViewed +
    s.kanjiViewed +
    s.kanaViewed +
    s.kanaReadingSessions * 50 + // each reading session = 50 cards
    s.kanaDrillSessions * 20 +
    s.dojoSectionsPassed * 10
  );
}

/** Deterministic tier + focus picker. Always returns a valid pair —
 *  used as the cold-start default and the AI fallback path. */
export function ruleClassifyTier(
  s: WeeklyEngagement,
): QuestTierClassification {
  // Tier — anchored to weekly quiz volume + active-day cadence.
  // The 'OR' on activeDays ensures someone who burst-studied for 1
  // day at 200 questions doesn't jump to "committed".
  let tier: QuestTier;
  if (s.quizAnswered < 50 || s.activeDays < 3) tier = "starter";
  else if (s.quizAnswered < 200 || s.activeDays < 5) tier = "steady";
  else if (s.quizAnswered < 500 || s.activeDays < 6) tier = "committed";
  else tier = "power";

  // Focus — "where did you spend your effort this week?" The
  // multipliers below normalise across activity densities (kanji
  // views are typically 1-tap-each; reading sessions are 50-card
  // commitments).
  const kanaScore = s.kanaReadingSessions * 50 + s.kanaDrillSessions * 25 +
    s.kanaViewed;
  const kanjiScore = s.kanjiViewed;
  const vocabScore = s.cardsViewed + s.quizAnswered;

  let focus: QuestFocus = "balanced";
  const top = Math.max(kanaScore, kanjiScore, vocabScore);
  if (top > 0) {
    // 1.5x lead = clear winner; otherwise stay balanced.
    if (kanaScore === top && kanaScore >= 1.5 * Math.max(kanjiScore, vocabScore))
      focus = "kana";
    else if (
      kanjiScore === top &&
      kanjiScore >= 1.5 * Math.max(kanaScore, vocabScore)
    )
      focus = "kanji";
    else if (
      vocabScore === top &&
      vocabScore >= 1.5 * Math.max(kanaScore, kanjiScore)
    )
      focus = "vocab";
  }

  return { tier, focus };
}

async function tryAIClassify(
  userId: string,
  signals: WeeklyEngagement,
): Promise<QuestTierClassification | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  // Don't burn an LLM call on near-empty data — rule path is exact.
  if (totalActivityScore(signals) < MIN_ACTIVITY_FOR_AI) return null;

  const limit = await rateLimit("ai", `quest-tier:${userId}`);
  if (!limit.success) return null;

  try {
    return await classifyQuestTier(pickWeeklyForAI(signals));
  } catch (err) {
    console.error("[quest-tier] AI classify failed, falling back:", err);
    return null;
  }
}

/** Return today's `(tier, focus)` for the user, computing + caching
 *  it if no valid row exists. Always succeeds: AI failure, missing
 *  GEMINI_API_KEY, exhausted rate bucket, and even DB upsert errors
 *  all degrade to the rule fallback so the resolver never blocks the
 *  dashboard. */
export async function getOrComputeUserQuestTier(
  userId: string,
): Promise<ResolvedTier> {
  const now = new Date();

  const existing = await prisma.userQuestTier.findUnique({
    where: { userId },
  });
  if (existing && existing.validUntil > now) {
    return {
      userId,
      tier: existing.tier as QuestTier,
      focus: existing.focus as QuestFocus,
      source: existing.source as ResolvedTier["source"],
      computedAt: existing.computedAt,
      validUntil: existing.validUntil,
      // The cached signals JSON is for debugging — not load-bearing for
      // the resolver, which only reads (tier, focus). Hydrate as best-
      // effort; if the JSON shape ever drifts, fall back to a zeroed
      // snapshot so callers can still render.
      signals: hydrateSignals(existing.signals, existing.computedAt),
    };
  }

  const signals = await getWeeklyEngagement(userId);
  const ai = await tryAIClassify(userId, signals);
  const classification = ai ?? ruleClassifyTier(signals);
  const source: ResolvedTier["source"] = ai ? "ai" : "rule_fallback";
  const validUntil = new Date(now.getTime() + TIER_TTL_MS);

  try {
    const saved = await prisma.userQuestTier.upsert({
      where: { userId },
      create: {
        userId,
        tier: classification.tier,
        focus: classification.focus,
        signals: signals as unknown as object,
        source,
        computedAt: now,
        validUntil,
      },
      update: {
        tier: classification.tier,
        focus: classification.focus,
        signals: signals as unknown as object,
        source,
        computedAt: now,
        validUntil,
      },
    });
    return {
      userId,
      tier: saved.tier as QuestTier,
      focus: saved.focus as QuestFocus,
      source: saved.source as ResolvedTier["source"],
      computedAt: saved.computedAt,
      validUntil: saved.validUntil,
      signals,
    };
  } catch (err) {
    // DB write failed — return the in-memory result so the resolver
    // can still render today. We'll retry the upsert on the next
    // request that finds no valid row.
    console.error("[quest-tier] upsert failed, returning ephemeral:", err);
    return {
      userId,
      tier: classification.tier,
      focus: classification.focus,
      source,
      computedAt: now,
      validUntil,
      signals,
    };
  }
}

function hydrateSignals(raw: unknown, computedAt: Date): WeeklyEngagement {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Partial<WeeklyEngagement>;
    return {
      startDayKey: typeof obj.startDayKey === "string" ? obj.startDayKey : "",
      endDayKey:
        typeof obj.endDayKey === "string"
          ? obj.endDayKey
          : computedAt.toISOString().slice(0, 10),
      quizAnswered: numOr0(obj.quizAnswered),
      quizCorrect: numOr0(obj.quizCorrect),
      quizAccuracy: numOr0(obj.quizAccuracy),
      quizAttempts: numOr0(obj.quizAttempts),
      cardsViewed: numOr0(obj.cardsViewed),
      kanjiViewed: numOr0(obj.kanjiViewed),
      kanaViewed: numOr0(obj.kanaViewed),
      kanaReadingSessions: numOr0(obj.kanaReadingSessions),
      kanaDrillSessions: numOr0(obj.kanaDrillSessions),
      dojoSectionsPassed: numOr0(obj.dojoSectionsPassed),
      activeDays: numOr0(obj.activeDays),
    };
  }
  return emptyWeeklyEngagement(
    computedAt.toISOString().slice(0, 10),
    computedAt.toISOString().slice(0, 10),
  );
}

function numOr0(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
