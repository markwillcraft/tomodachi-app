import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProgressSummary, getSlowestWords } from "@/lib/stats";
import { requireUserId } from "@/lib/auth-utils";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const [summary, slowestWords] = await Promise.all([
    getProgressSummary(userId),
    getSlowestWords(userId),
  ]);

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, mode: true, total: true, correct: true, createdAt: true },
  });

  const byDay = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const day = a.createdAt.toISOString().slice(0, 10);
    const b = byDay.get(day) ?? { correct: 0, total: 0 };
    b.correct += a.correct;
    b.total += a.total;
    byDay.set(day, b);
  }
  const accuracyByDay = Array.from(byDay.entries()).map(([day, v]) => ({
    day,
    accuracy: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
    total: v.total,
  }));

  return NextResponse.json({
    summary,
    slowestWords,
    attempts,
    accuracyByDay,
  });
}
