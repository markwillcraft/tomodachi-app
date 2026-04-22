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

export const runtime = "nodejs";

// Build a review quiz from the user's due SRS queue. Each item maps to
// a fresh question via the same builders the regular quiz generator
// uses, so distractors are re-rolled and every attempt drills a
// genuinely different representation of the item. Oldest-due first.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 50
      ? Math.floor(rawLimit)
      : 20;

  const due = await getDueItems(userId, limit);
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
