import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { getKanjiByChar } from "@/lib/kanji";
import { awardForKanjiView } from "@/lib/coins";

export const runtime = "nodejs";

// POST /api/kanji/view  { char: "友" }
// Logs a "studied" event for the given kanji. Accepts at most one write
// per character per 10 seconds per user so a single page visit doesn't
// spam rows if audio is played repeatedly.
const DEDUP_WINDOW_MS = 10_000;

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { char } = (body ?? {}) as { char?: string };
  if (typeof char !== "string" || char.length === 0) {
    return NextResponse.json(
      { error: "char must be a non-empty string" },
      { status: 400 },
    );
  }

  // Basic whitelist: only allow characters that exist in our N5 set so we
  // don't accumulate junk rows if someone calls the endpoint directly.
  if (!getKanjiByChar(char)) {
    return NextResponse.json(
      { error: "Unknown kanji character" },
      { status: 400 },
    );
  }

  const recent = await prisma.kanjiView.findFirst({
    where: {
      userId,
      char,
      createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const view = await prisma.kanjiView.create({ data: { userId, char } });
  const coins = await awardForKanjiView(userId, view.id);
  return NextResponse.json({ ok: true, coins });
}
