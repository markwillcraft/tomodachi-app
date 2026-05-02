import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import {
  buildKanaQuestion,
  buildKanjiQuestion,
  buildVocabQuestion,
  type Question,
} from "@/lib/quiz";
import { HIRAGANA, KATAKANA, type KanaPair } from "@/lib/kana";
import { N5_KANJI } from "@/lib/kanji";
import { getDueItems } from "@/lib/srs";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Build a review quiz from the user's due SRS queue. Each item maps to
// a fresh question via the same builders the regular quiz generator
// uses, so distractors are re-rolled and every attempt drills a
// genuinely different representation of the item. Oldest-due first.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 50
      ? Math.floor(rawLimit)
      : 20;

  const due = await getDueItems(userId, limit);

  // Belt-and-suspenders cleanup: getDueItems already filters out
  // orphaned ReviewState rows (vocab whose Word was deleted, kana/kanji
  // chars not in the canonical lists). To stop them counting forever
  // against the user, hard-delete those orphans here once we've
  // observed them. This keeps the table tidy even though the read path
  // would already hide them.
  await sweepOrphans(userId);

  if (due.length === 0) {
    return NextResponse.json({ questions: [] as Question[] });
  }

  // Pre-load vocab if any vocab items are due so buildVocabQuestion has
  // a distractor pool of the right shape. We pull the user's full list
  // (same as /api/quiz/generate) rather than scoping to just due words
  // so multiple-choice distractors stay varied.
  const hasVocab = due.some((d) => d.itemType === "vocab");
  const allWords = hasVocab
    ? await prisma.word.findMany({ where: { userId } })
    : [];
  const wordById = new Map(allWords.map((w) => [w.id, w]));

  const kanaTable: KanaPair[] = [...HIRAGANA, ...KATAKANA];
  const kanaByChar = new Map(kanaTable.map((p) => [p.kana, p]));

  const questions: Question[] = [];
  for (const item of due) {
    if (item.itemType === "vocab") {
      const id = Number(item.itemKey);
      const word = wordById.get(id);
      // getDueItems already filtered these out, but a concurrent delete
      // between that read and this one would leave a stale row — skip
      // rather than crash the response.
      if (!word) continue;
      questions.push(buildVocabQuestion(word, allWords));
    } else if (item.itemType === "kanji") {
      const target = N5_KANJI.find((k) => k.char === item.itemKey);
      if (!target) continue;
      questions.push(buildKanjiQuestion(target, N5_KANJI));
    } else if (item.itemType === "kana") {
      const target = kanaByChar.get(item.itemKey);
      if (!target) continue;
      const isHira = HIRAGANA.some((p) => p.kana === target.kana);
      questions.push(
        buildKanaQuestion(
          isHira ? HIRAGANA : KATAKANA,
          isHira ? "hiragana_char" : "katakana_char",
          kanaTable,
          target,
        ),
      );
    }
  }

  // Light shuffle so two same-item variants (e.g. both kinds of the
  // same word) don't land back-to-back.
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return NextResponse.json({ questions });
}

// Hard-delete any ReviewState rows that the read path can't materialize
// any more. Runs synchronously so the next call is consistent; the cost
// is one cheap targeted query per type that has orphans, none if the
// user is already clean.
async function sweepOrphans(userId: string): Promise<void> {
  const rows = await prisma.reviewState.findMany({
    where: { userId },
    select: { id: true, itemType: true, itemKey: true },
  });
  if (rows.length === 0) return;

  const vocabIds = rows
    .filter((r) => r.itemType === "vocab")
    .map((r) => Number(r.itemKey))
    .filter((id) => Number.isInteger(id));

  const ownedWordIds = vocabIds.length
    ? new Set(
        (
          await prisma.word.findMany({
            where: { userId, id: { in: vocabIds } },
            select: { id: true },
          })
        ).map((w) => w.id),
      )
    : new Set<number>();

  const kanaSet = new Set<string>([
    ...HIRAGANA.map((p) => p.kana),
    ...KATAKANA.map((p) => p.kana),
  ]);
  const kanjiSet = new Set<string>(N5_KANJI.map((k) => k.char));

  const orphanIds = rows
    .filter((r) => {
      if (r.itemType === "vocab") {
        const id = Number(r.itemKey);
        return !Number.isInteger(id) || !ownedWordIds.has(id);
      }
      if (r.itemType === "kana") return !kanaSet.has(r.itemKey);
      if (r.itemType === "kanji") return !kanjiSet.has(r.itemKey);
      return true;
    })
    .map((r) => r.id);

  if (orphanIds.length === 0) return;

  await prisma.reviewState.deleteMany({
    where: { userId, id: { in: orphanIds } },
  });
}
