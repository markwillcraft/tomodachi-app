import type { Word } from "@prisma/client";
import { HIRAGANA, KATAKANA, type KanaPair } from "./kana";
import { N5_KANJI, type Kanji } from "./kanji";

export type QuestionKind =
  | "kana_to_romaji"
  | "romaji_to_english"
  | "romaji_to_kana"
  | "hiragana_char"
  | "katakana_char"
  | "kanji_to_meaning"
  | "meaning_to_kanji"
  | "kanji_to_reading";

export type Question = {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  kind: QuestionKind;
  wordId?: number;
};

export type QuizMode = "vocab" | "hiragana" | "katakana" | "mixed" | "kanji";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniqueChoices(correct: string, pool: string[], n = 3): string[] {
  const filtered = Array.from(new Set(pool.filter((p) => p && p !== correct)));
  const shuffled = shuffle(filtered).slice(0, n);
  while (shuffled.length < n) {
    shuffled.push(`?${shuffled.length + 1}`);
  }
  return shuffled;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

type WeightedWord = { word: Word; accuracy: number };

function weightedSample(weighted: WeightedWord[]): Word {
  const weights = weighted.map((w) => 1 + (1 - w.accuracy) * 3);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weighted.length; i++) {
    r -= weights[i];
    if (r <= 0) return weighted[i].word;
  }
  return weighted[weighted.length - 1].word;
}

function buildVocabQuestion(
  word: Word,
  pool: Word[],
  forcedKind?: "kana_to_romaji" | "romaji_to_english" | "romaji_to_kana",
): Question {
  const kinds: Array<"kana_to_romaji" | "romaji_to_english" | "romaji_to_kana"> = [
    "kana_to_romaji",
    "romaji_to_english",
    "romaji_to_kana",
  ];
  const kind = forcedKind ?? pickRandom(kinds);

  if (kind === "kana_to_romaji") {
    const correct = capitalize(word.romaji);
    const distractors = uniqueChoices(
      correct,
      pool.map((w) => capitalize(w.romaji)),
    );
    const choices = shuffle([correct, ...distractors]);
    return {
      id: `vocab_${word.id}_kana_to_romaji_${Date.now()}_${Math.random()}`,
      prompt: word.hiragana,
      choices,
      correctIndex: choices.indexOf(correct),
      kind,
      wordId: word.id,
    };
  }

  if (kind === "romaji_to_english") {
    const correct = word.english || "(no translation)";
    const distractors = uniqueChoices(
      correct,
      pool.map((w) => w.english).filter((e) => e.length > 0),
    );
    const choices = shuffle([correct, ...distractors]);
    return {
      id: `vocab_${word.id}_romaji_to_english_${Date.now()}_${Math.random()}`,
      prompt: capitalize(word.romaji),
      choices,
      correctIndex: choices.indexOf(correct),
      kind,
      wordId: word.id,
    };
  }

  const correct = word.hiragana;
  const distractors = uniqueChoices(
    correct,
    pool.map((w) => w.hiragana),
  );
  const choices = shuffle([correct, ...distractors]);
  return {
    id: `vocab_${word.id}_romaji_to_kana_${Date.now()}_${Math.random()}`,
    prompt: capitalize(word.romaji),
    choices,
    correctIndex: choices.indexOf(correct),
    kind: "romaji_to_kana",
    wordId: word.id,
  };
}

function buildKanaQuestion(
  table: KanaPair[],
  kind: "hiragana_char" | "katakana_char",
  // Pool of distractors. Defaults to the same table the prompt comes from
  // but the kana quiz UI may pass a richer pool spanning hiragana+katakana.
  distractorPool?: KanaPair[],
): Question {
  const target = pickRandom(table);
  const correct = target.romaji;
  const pool = distractorPool ?? table;
  const distractors = uniqueChoices(
    correct,
    pool.map((p) => p.romaji),
  );
  const choices = shuffle([correct, ...distractors]);
  return {
    id: `${kind}_${target.kana}_${Date.now()}_${Math.random()}`,
    prompt: target.kana,
    choices,
    correctIndex: choices.indexOf(correct),
    kind,
  };
}

function buildKanjiQuestion(
  target: Kanji,
  pool: Kanji[],
  forcedKind?: "kanji_to_meaning" | "meaning_to_kanji" | "kanji_to_reading",
): Question {
  const kinds: Array<"kanji_to_meaning" | "meaning_to_kanji" | "kanji_to_reading"> = [
    "kanji_to_meaning",
    "meaning_to_kanji",
    "kanji_to_reading",
  ];
  const kind = forcedKind ?? pickRandom(kinds);

  if (kind === "kanji_to_meaning") {
    const correct = target.meaning;
    const distractors = uniqueChoices(
      correct,
      pool.map((k) => k.meaning),
    );
    const choices = shuffle([correct, ...distractors]);
    return {
      id: `kanji_${target.char}_meaning_${Date.now()}_${Math.random()}`,
      prompt: target.char,
      choices,
      correctIndex: choices.indexOf(correct),
      kind,
    };
  }

  if (kind === "meaning_to_kanji") {
    const correct = target.char;
    const distractors = uniqueChoices(
      correct,
      pool.map((k) => k.char),
    );
    const choices = shuffle([correct, ...distractors]);
    return {
      id: `kanji_${target.char}_meaning_to_kanji_${Date.now()}_${Math.random()}`,
      prompt: target.meaning,
      choices,
      correctIndex: choices.indexOf(correct),
      kind,
    };
  }

  // kanji_to_reading: prompt is the kanji, ask for the most common reading.
  const correct = target.on[0] ?? target.kun[0] ?? target.meaning;
  const allReadings = pool
    .flatMap((k) => [...k.on, ...k.kun])
    .filter(Boolean);
  const distractors = uniqueChoices(correct, allReadings);
  const choices = shuffle([correct, ...distractors]);
  return {
    id: `kanji_${target.char}_reading_${Date.now()}_${Math.random()}`,
    prompt: target.char,
    choices,
    correctIndex: choices.indexOf(correct),
    kind: "kanji_to_reading",
  };
}

export type WordWithStats = Word & {
  totalAnswered: number;
  totalCorrect: number;
};

export type GenerateOptions = {
  // Subset of kana to use for hiragana/katakana modes. When omitted, the
  // full table is used.
  kanaSubset?: KanaPair[];
  hiraganaSubset?: KanaPair[];
  katakanaSubset?: KanaPair[];
  // Subset of kanji to use for kanji mode.
  kanjiSubset?: Kanji[];
};

export function generateQuestions(
  count: number,
  mode: QuizMode,
  words: WordWithStats[],
  options: GenerateOptions = {},
): Question[] {
  const questions: Question[] = [];

  const vocabAvailable = words.length >= 1;
  const weighted: WeightedWord[] = words.map((w) => ({
    word: w,
    accuracy: w.totalAnswered === 0 ? 0.5 : w.totalCorrect / w.totalAnswered,
  }));

  const hiraTable =
    options.hiraganaSubset && options.hiraganaSubset.length >= 1
      ? options.hiraganaSubset
      : HIRAGANA;
  const kataTable =
    options.katakanaSubset && options.katakanaSubset.length >= 1
      ? options.katakanaSubset
      : KATAKANA;
  const kanjiTable =
    options.kanjiSubset && options.kanjiSubset.length >= 1
      ? options.kanjiSubset
      : N5_KANJI;

  for (let i = 0; i < count; i++) {
    let effectiveMode: QuizMode = mode;
    if (mode === "mixed") {
      const opts: QuizMode[] = ["hiragana", "katakana"];
      if (vocabAvailable) opts.push("vocab", "vocab");
      effectiveMode = pickRandom(opts);
    }

    if (effectiveMode === "vocab") {
      if (!vocabAvailable) {
        questions.push(buildKanaQuestion(hiraTable, "hiragana_char"));
        continue;
      }
      const word = weightedSample(weighted);
      questions.push(buildVocabQuestion(word, words));
    } else if (effectiveMode === "hiragana") {
      questions.push(buildKanaQuestion(hiraTable, "hiragana_char"));
    } else if (effectiveMode === "katakana") {
      questions.push(buildKanaQuestion(kataTable, "katakana_char"));
    } else if (effectiveMode === "kanji") {
      const target = pickRandom(kanjiTable);
      questions.push(buildKanjiQuestion(target, kanjiTable));
    }
  }

  return questions;
}
