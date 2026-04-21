import { NextResponse } from "next/server";
import { generateQuestions, type QuizMode } from "@/lib/quiz";
import { getWordsWithStats } from "@/lib/stats";
import { requireUserId } from "@/lib/auth-utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { count, mode } = (body ?? {}) as {
    count?: number;
    mode?: QuizMode;
  };

  if (typeof count !== "number" || count < 1 || count > 200) {
    return NextResponse.json(
      { error: "count must be a number between 1 and 200" },
      { status: 400 },
    );
  }
  if (!mode || !["vocab", "hiragana", "katakana", "mixed"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const words = await getWordsWithStats(userId);
  if (mode === "vocab" && words.length === 0) {
    return NextResponse.json(
      { error: "No vocabulary words imported yet. Import some first." },
      { status: 400 },
    );
  }

  const questions = generateQuestions(count, mode, words);
  return NextResponse.json({ questions });
}
