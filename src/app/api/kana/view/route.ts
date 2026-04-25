import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { HIRAGANA, KATAKANA } from "@/lib/kana";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/kana/view  { kana: "あ" }
// Logs a "studied" event for the given kana character. Soft signal —
// we use this only to mark items as "Started" in the N5 mastery
// modal. SRS levels still only advance through quiz answers.
//
// No coin awards are issued here (unlike CardView / KanjiView): tapping
// a cell in the reference table to hear pronunciation is a tiny
// micro-interaction and we don't want to incentivize farming it. The
// dedup window also keeps audio repeat-taps from creating noise.
const DEDUP_WINDOW_MS = 10_000;

const KANA_SET = new Set<string>([
  ...HIRAGANA.map((p) => p.kana),
  ...KATAKANA.map((p) => p.kana),
]);

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // Tapping kana cells in the reference grid fires this rapidly.
  // `view` bucket has the generous limit needed.
  const limited = await enforceRateLimit("view", userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { kana } = (body ?? {}) as { kana?: string };
  if (typeof kana !== "string" || kana.length === 0) {
    return NextResponse.json(
      { error: "kana must be a non-empty string" },
      { status: 400 },
    );
  }

  // Whitelist to known catalog entries so direct API hits can't fill
  // the table with arbitrary strings.
  if (!KANA_SET.has(kana)) {
    return NextResponse.json(
      { error: "Unknown kana character" },
      { status: 400 },
    );
  }

  const recent = await prisma.kanaView.findFirst({
    where: {
      userId,
      kana,
      createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await prisma.kanaView.create({ data: { userId, kana } });
  return NextResponse.json({ ok: true });
}
