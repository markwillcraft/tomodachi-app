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
  if (enriched.length === 0) {
    return NextResponse.json({ words: [] });
  }

  // Each /import call becomes its own batch ("Import #N") so users can
  // browse vocab grouped by when they added it. We count existing import-
  // sourced batches to pick the next number.
  const existingImports = await prisma.importBatch.count({
    where: { userId, source: "import" },
  });
  const batch = await prisma.importBatch.create({
    data: {
      userId,
      source: "import",
      name: `Import #${existingImports + 1}`,
    },
  });

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
          batchId: batch.id,
        },
        update: {
          hiragana: w.hiragana,
          katakana: w.katakana,
          english: w.english,
          // Re-importing a word moves it to the most recent batch, which
          // matches the mental model of "this is what I added today".
          batchId: batch.id,
        },
      }),
    ),
  );

  return NextResponse.json({
    batch: { id: batch.id, name: batch.name },
    words: saved.map((w, i) => ({
      ...w,
      needsReview: enriched[i].needsReview,
    })),
  });
}
