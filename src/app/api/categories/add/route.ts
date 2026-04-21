import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import { getCategoryBySlug } from "@/lib/categories";

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

  const { slug, romaji } = (body ?? {}) as {
    slug?: string;
    romaji?: string[];
  };

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const category = getCategoryBySlug(slug);
  if (!category) {
    return NextResponse.json({ error: "Unknown category" }, { status: 404 });
  }

  // If `romaji` is provided, only add those (subset add). Otherwise, add the
  // entire category.
  let toAdd = category.words;
  if (Array.isArray(romaji) && romaji.length > 0) {
    const set = new Set(romaji.map((r) => r.toLowerCase()));
    toAdd = category.words.filter((w) => set.has(w.romaji.toLowerCase()));
  }

  if (toAdd.length === 0) {
    return NextResponse.json({ error: "No words to add" }, { status: 400 });
  }

  // Upsert each word into the user's library. Existing words get updated kana
  // / english from the catalog (keeps them in sync if the catalog improves).
  const saved = await Promise.all(
    toAdd.map((w) =>
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
    added: saved.length,
    words: saved,
  });
}
