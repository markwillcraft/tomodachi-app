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

  // Reuse the same per-category batch when the user incrementally adds
  // words (e.g. one at a time from the table). That way the vocab page
  // still shows a single "Greetings (N5)" group instead of fragmenting
  // into one batch per click.
  const batchName = `${category.name} (${category.level})`;
  let batch = await prisma.importBatch.findFirst({
    where: { userId, source: "category", name: batchName },
  });
  if (!batch) {
    batch = await prisma.importBatch.create({
      data: { userId, source: "category", name: batchName },
    });
  }

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
          batchId: batch!.id,
        },
        update: {
          hiragana: w.hiragana,
          katakana: w.katakana,
          english: w.english,
          batchId: batch!.id,
        },
      }),
    ),
  );

  return NextResponse.json({
    added: saved.length,
    batch: { id: batch.id, name: batch.name },
    words: saved,
  });
}
