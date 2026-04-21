import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichRomajiList } from "@/lib/enrich";
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

  const romaji = (body as { romaji?: unknown })?.romaji;
  if (!Array.isArray(romaji) || !romaji.every((r) => typeof r === "string")) {
    return NextResponse.json(
      { error: "Body must be { romaji: string[] }" },
      { status: 400 },
    );
  }

  const enriched = await enrichRomajiList(romaji);

  const saved = await Promise.all(
    enriched.map((w) =>
      prisma.word.upsert({
        where: { userId_romaji: { userId, romaji: w.romaji } },
        create: {
          userId,
          romaji: w.romaji,
          hiragana: w.hiragana,
          katakana: w.katakana,
          english: w.english,
        },
        update: {
          hiragana: w.hiragana,
          katakana: w.katakana,
          english: w.english,
        },
      }),
    ),
  );

  return NextResponse.json({
    words: saved.map((w, i) => ({
      ...w,
      needsReview: enriched[i].needsReview,
    })),
  });
}
