import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { awardForQuiz } from "@/lib/coins";
import { itemFromResult, recordReview, type ReviewOutcome } from "@/lib/srs";
import { evaluateAchievements } from "@/lib/achievements";

export const runtime = "nodejs";

type SubmittedResult = {
  wordId?: number | null;
  kind: string;
  prompt: string;
  correct: string;
  picked: string;
  isCorrect: boolean;
  // Time taken to answer this question, in milliseconds.
  timeMs?: number | null;
};

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode, results } = (body ?? {}) as {
    mode?: string;
    results?: SubmittedResult[];
  };

  if (!mode || typeof mode !== "string") {
    return NextResponse.json({ error: "Missing mode" }, { status: 400 });
  }
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "Missing results" }, { status: 400 });
  }

  // Make sure any wordId references actually belong to this user. Anything
  // else gets stored as null so we don't link results to other users' words.
  const wordIds = Array.from(
    new Set(
      results
        .map((r) => r.wordId)
        .filter((id): id is number => typeof id === "number"),
    ),
  );
  const ownedWordIds = new Set(
    wordIds.length === 0
      ? []
      : (
          await prisma.word.findMany({
            where: { id: { in: wordIds }, userId },
            select: { id: true },
          })
        ).map((w) => w.id),
  );

  const total = results.length;
  const correct = results.filter((r) => r.isCorrect).length;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      mode,
      total,
      correct,
      results: {
        create: results.map((r) => ({
          wordId:
            typeof r.wordId === "number" && ownedWordIds.has(r.wordId)
              ? r.wordId
              : null,
          kind: r.kind,
          prompt: r.prompt,
          correct: r.correct,
          picked: r.picked,
          isCorrect: r.isCorrect,
          timeMs: typeof r.timeMs === "number" ? Math.max(0, Math.round(r.timeMs)) : null,
        })),
      },
    },
  });

  // Award action + quest coins. Idempotent on attemptId so a network
  // retry doesn't double-pay.
  const coins = await awardForQuiz(userId, attempt.id, total, correct);

  // Update spaced-repetition state for each answer. We run reviews
  // sequentially (each targets a different row) to avoid fighting over
  // the same upsert when the same item was asked twice in one quiz.
  // Failures here shouldn't block the response — the worst case is a
  // slightly stale schedule, which self-heals on the next answer.
  // We also collect the post-update outcome per question so the client
  // results screen can show "level 2 → 3, mastered" badges (kana
  // results page especially).
  const srsOutcomes: Array<ReviewOutcome & { questionIdx: number }> = [];
  try {
    for (let i = 0; i < results.length; i += 1) {
      const r = results[i];
      const item = itemFromResult(
        r.kind,
        r.prompt,
        r.correct,
        typeof r.wordId === "number" && ownedWordIds.has(r.wordId)
          ? r.wordId
          : null,
      );
      if (!item) continue;
      try {
        const outcome = await recordReview(
          userId,
          item.type,
          item.key,
          r.isCorrect,
        );
        srsOutcomes.push({ ...outcome, questionIdx: i });
      } catch {
        // Skip this row but keep the rest going.
      }
    }
  } catch {
    // Swallow; SRS is best-effort for this response.
  }

  // Evaluate achievements after everything else so counters are fresh.
  // Returns the list of *newly* unlocked rows so the client can
  // celebrate them on the results screen.
  const newlyUnlocked = await evaluateAchievements(userId);

  return NextResponse.json({
    attemptId: attempt.id,
    coins,
    newlyUnlocked,
    srs: srsOutcomes.map((o) => ({
      questionIdx: o.questionIdx,
      itemType: o.itemType,
      itemKey: o.itemKey,
      prevLevel: o.prevLevel,
      level: o.level,
      isNew: o.isNew,
      leveledUp: o.leveledUp,
      reset: o.reset,
      mastered: o.mastered,
      totalCorrect: o.totalCorrect,
      totalSeen: o.totalSeen,
    })),
  });
}
