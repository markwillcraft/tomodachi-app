import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const { wordId } = (body ?? {}) as { wordId?: number };
  if (typeof wordId !== "number") {
    return NextResponse.json({ error: "Missing wordId" }, { status: 400 });
  }

  // Make sure the word actually belongs to this user before logging a view
  // against it. Prevents anyone bumping their streak with someone else's
  // word ids.
  const word = await prisma.word.findFirst({
    where: { id: wordId, userId },
    select: { id: true },
  });
  if (!word) {
    return NextResponse.json({ error: "Word not found" }, { status: 404 });
  }

  await prisma.cardView.create({ data: { userId, wordId } });
  return NextResponse.json({ ok: true });
}
