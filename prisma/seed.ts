// =====================================================================
// Prisma seed runner
// ---------------------------------------------------------------------
// Run via `npx prisma db seed` (registered in package.json#prisma.seed
// to invoke `tsx prisma/seed.ts`).
//
// Today this only seeds the Reading mode bank (`ReadingWord`). As more
// content surfaces migrate to DB tables per the plan in
// .cursor/docs/roadmap/12-words-transfer-to-database.md, append a new
// seed-* function below and call it from `main()`.
//
// Two design properties we keep:
//
//   1. *Mora correctness is asserted before any DB write.* The
//      Reading mode UI promises exactly N-mora words per stage, so a
//      malformed seed must fail loudly instead of corrupting prod
//      content. We compute splitMora(display).length for every entry
//      up front and abort with a non-zero exit if any row is wrong.
//
//   2. *Re-seeding is idempotent and admin-safe.* The `ReadingWord`
//      table has @@unique([stage, dayOfCycle, sortIndex]); we use
//      `createMany({ skipDuplicates: true })` so a re-run never
//      clobbers admin-edited rows. To replace an authored row, the
//      admin tooling (roadmap 12) updates it directly — the seed
//      will not touch it.
// =====================================================================

import { PrismaClient } from "@prisma/client";

import { splitMora } from "../src/lib/japanese-romaji";
import { READING_WORD_BANKS } from "./seed/reading-words";

const prisma = new PrismaClient();

// We rotate the order in which a stage's 50 words are placed across
// the 5 dayOfCycle slots so a learner who plays Monday and then
// Tuesday gets the same vocabulary in a different sequence. The
// schedule is `(sortIndex - 1 + (dayOfCycle - 1) * STRIDE) mod 50`
// where STRIDE = 13 — coprime with 50, so each (stage, dayOfCycle)
// gets a complete unique permutation of all 50 indices.
const ROTATION_STRIDE = 13;

type ReadingWordRow = {
  stage: number;
  dayOfCycle: number;
  sortIndex: number;
  display: string;
  romaji: string;
  english: string;
  kanji: string | null;
  mora: number;
};

function buildReadingWordRows(): ReadingWordRow[] {
  const rows: ReadingWordRow[] = [];
  for (let bankIdx = 0; bankIdx < READING_WORD_BANKS.length; bankIdx += 1) {
    const stage = bankIdx + 1;
    const expectedMora = stage + 1;
    const bank = READING_WORD_BANKS[bankIdx];

    if (bank.length !== 50) {
      throw new Error(
        `Stage ${stage} bank has ${bank.length} entries; expected exactly 50.`,
      );
    }

    for (let dayOfCycle = 1; dayOfCycle <= 5; dayOfCycle += 1) {
      for (let i = 0; i < 50; i += 1) {
        const wordIdx = (i + (dayOfCycle - 1) * ROTATION_STRIDE) % 50;
        const word = bank[wordIdx];
        const moraCount = splitMora(word.display).length;
        if (moraCount !== expectedMora) {
          throw new Error(
            `Stage ${stage} word "${word.display}" (romaji=${word.romaji}) ` +
              `has ${moraCount} mora; expected ${expectedMora}.`,
          );
        }
        rows.push({
          stage,
          dayOfCycle,
          sortIndex: i + 1,
          display: word.display,
          romaji: word.romaji,
          english: word.english,
          kanji: word.kanji ?? null,
          mora: moraCount,
        });
      }
    }
  }
  return rows;
}

async function seedReadingWords() {
  console.log("→ Seeding ReadingWord …");
  const rows = buildReadingWordRows();
  const result = await prisma.readingWord.createMany({
    data: rows,
    skipDuplicates: true,
  });
  console.log(
    `  ✓ ${result.count} new rows inserted (${rows.length - result.count} ` +
      `existing rows left untouched). Total target: ${rows.length}.`,
  );
}

async function main() {
  await seedReadingWords();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
