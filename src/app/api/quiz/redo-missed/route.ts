import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";
import {
  buildKanaQuestion,
  buildKanjiQuestion,
  buildVocabQuestion,
  type Question,
  type QuestionKind,
} from "@/lib/quiz";
import { HIRAGANA, KATAKANA, type KanaPair } from "@/lib/kana";
import { N5_KANJI, type Kanji } from "@/lib/kanji";

export const runtime = "nodejs";

const VOCAB_KINDS: QuestionKind[] = [
  "kana_to_romaji",
  "romaji_to_english",
  "romaji_to_kana",
];
const KANJI_KINDS: QuestionKind[] = [
  "kanji_to_meaning",
  "meaning_to_kanji",
  "kanji_to_reading",
];
const KANA_KINDS: QuestionKind[] = ["hiragana_char", "katakana_char"];

// Pull the user's most recent wrong answers, deduplicate by item+kind so
// we don't re-ask the *exact* same gap multiple times in a row, then
// rebuild fresh questions (with new distractors) using the existing
// quiz builders. This drills the actual gap, not a random sample of
// questions the user happened to face.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 50
      ? Math.floor(rawLimit)
      : 20;

  // Look at a wide-ish window of recent wrong answers and dedupe so the
  // returned set covers more *distinct* gaps than the latest 20 raw rows
  // (which can be dominated by one stubborn word).
  const wrongRows = await prisma.questionResult.findMany({
    where: {
      attempt: { userId },
      isCorrect: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit * 8,
    select: {
      kind: true,
      prompt: true,
      correct: true,
      wordId: true,
      word: {
        select: {
          id: true,
          userId: true,
          romaji: true,
          hiragana: true,
          katakana: true,
          english: true,
          createdAt: true,
          batchId: true,
        },
      },
    },
  });

  // Dedupe key = (kind, item-identity). Item identity is the wordId for
  // vocab, the prompt for kana, and the correct answer for kanji (since
  // kanji questions can flip prompt/answer depending on kind).
  const seen = new Set<string>();
  const picked: typeof wrongRows = [];
  for (const row of wrongRows) {
    const itemKey =
      row.wordId !== null
        ? `w:${row.wordId}`
        : row.kind === "kanji_to_meaning" || row.kind === "kanji_to_reading"
          ? `k:${row.prompt}`
          : row.kind === "meaning_to_kanji"
            ? `k:${row.correct}`
            : `c:${row.prompt}`; // kana
    const key = `${row.kind}::${itemKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(row);
    if (picked.length >= limit) break;
  }

  // Pull the user's full word list once so we have a rich distractor pool
  // for vocab questions (matches what /api/quiz/generate does).
  const words = picked.some((p) => p.wordId !== null)
    ? await prisma.word.findMany({ where: { userId } })
    : [];

  const questions: Question[] = [];
  for (const row of picked) {
    const kind = row.kind as QuestionKind;
    const q = rebuild(row, kind, words);
    if (q) questions.push(q);
  }

  // Shuffle so two recent misses on the same word don't surface back-
  // to-back even after the dedupe pass (different kinds for the same
  // word still survive dedupe).
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return NextResponse.json({ questions });
}

type WrongRow = {
  kind: string;
  prompt: string;
  correct: string;
  wordId: number | null;
  word: {
    id: number;
    userId: string;
    romaji: string;
    hiragana: string;
    katakana: string;
    english: string;
    createdAt: Date;
    batchId: number | null;
  } | null;
};

function rebuild(
  row: WrongRow,
  kind: QuestionKind,
  vocabPool: WrongRow["word"][] | typeof N5_KANJI,
): Question | null {
  if (VOCAB_KINDS.includes(kind)) {
    if (!row.word) return null;
    const pool = vocabPool as NonNullable<WrongRow["word"]>[];
    return buildVocabQuestion(
      row.word,
      pool,
      kind as "kana_to_romaji" | "romaji_to_english" | "romaji_to_kana",
    );
  }

  if (KANJI_KINDS.includes(kind)) {
    // Reverse-engineer the target kanji from the original prompt/correct.
    const targetChar =
      kind === "meaning_to_kanji" ? row.correct : row.prompt;
    const target: Kanji | undefined = N5_KANJI.find((k) => k.char === targetChar);
    if (!target) return null;
    return buildKanjiQuestion(
      target,
      N5_KANJI,
      kind as "kanji_to_meaning" | "meaning_to_kanji" | "kanji_to_reading",
    );
  }

  if (KANA_KINDS.includes(kind)) {
    const table: KanaPair[] =
      kind === "hiragana_char" ? HIRAGANA : KATAKANA;
    const target = table.find((p) => p.kana === row.prompt);
    if (!target) return null;
    return buildKanaQuestion(
      table,
      kind as "hiragana_char" | "katakana_char",
      table,
      target,
    );
  }

  return null;
}
