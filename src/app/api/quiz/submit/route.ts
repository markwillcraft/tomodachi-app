import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";

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

  return NextResponse.json({ attemptId: attempt.id });
}
