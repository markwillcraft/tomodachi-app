import { NextResponse } from "next/server";
import { toHiragana, toKatakana } from "wanakana";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("write", userId);
  if (limited) return limited;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { romaji, hiragana, katakana, english } = (body ?? {}) as {
    romaji?: string;
    hiragana?: string;
    katakana?: string;
    english?: string;
  };

  // Ensure the word belongs to this user before updating.
  const existing = await prisma.word.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build patch: when romaji changes we automatically re-derive both kana
  // forms unless the caller explicitly passes their own. This keeps the
  // three fields in sync after a user-initiated correction.
  const data: {
    romaji?: string;
    hiragana?: string;
    katakana?: string;
    english?: string;
  } = {};

  if (typeof romaji === "string" && romaji.trim().length > 0) {
    const cleaned = romaji.trim().toLowerCase();
    data.romaji = cleaned;
    const noSpaces = cleaned.replace(/\s+/g, "");
    if (typeof hiragana !== "string") data.hiragana = toHiragana(noSpaces);
    if (typeof katakana !== "string") data.katakana = toKatakana(noSpaces);
  }
  if (typeof hiragana === "string") data.hiragana = hiragana;
  if (typeof katakana === "string") data.katakana = katakana;
  if (typeof english === "string") data.english = english;

  const updated = await prisma.word.update({
    where: { id },
    data,
  });

  return NextResponse.json({ word: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("write", userId);
  if (limited) return limited;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.word.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.word.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
