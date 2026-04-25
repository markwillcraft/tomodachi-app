import { NextResponse } from "next/server";
import {
  generateQuestions,
  type QuizMode,
  type GenerateOptions,
} from "@/lib/quiz";
import { getWordsWithStats } from "@/lib/stats";
import { requireUserId } from "@/lib/auth-utils";
import { getKanaForGroups, type KanaScript } from "@/lib/kana";
import { N5_KANJI } from "@/lib/kanji";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VALID_MODES: QuizMode[] = [
  "vocab",
  "hiragana",
  "katakana",
  "mixed",
  "kanji",
];

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // Read-shaped but POST so it lives in the `read` bucket — generous
  // limit covers a real user opening multiple quiz sessions in a row.
  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { count, mode, kanaScript, kanaGroups, kanjiChars } = (body ?? {}) as {
    count?: number;
    mode?: QuizMode;
    kanaScript?: KanaScript;
    kanaGroups?: string[];
    kanjiChars?: string[];
  };

  if (typeof count !== "number" || count < 1 || count > 200) {
    return NextResponse.json(
      { error: "count must be a number between 1 and 200" },
      { status: 400 },
    );
  }
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const words = await getWordsWithStats(userId);
  if (mode === "vocab" && words.length === 0) {
    return NextResponse.json(
      { error: "No vocabulary words imported yet. Import some first." },
      { status: 400 },
    );
  }

  const options: GenerateOptions = {};

  // Apply kana group filter when the request asks for hiragana/katakana
  // and provides specific row groups (a, k, s, ...).
  if ((mode === "hiragana" || mode === "katakana") && Array.isArray(kanaGroups) && kanaGroups.length > 0) {
    const script: KanaScript =
      kanaScript === "both"
        ? "both"
        : mode === "hiragana"
          ? "hiragana"
          : "katakana";
    const subset = getKanaForGroups(kanaGroups, script);
    if (subset.length === 0) {
      return NextResponse.json(
        { error: "Selected kana groups produced an empty set" },
        { status: 400 },
      );
    }
    if (script === "hiragana") {
      options.hiraganaSubset = subset;
    } else if (script === "katakana") {
      options.katakanaSubset = subset;
    } else {
      // "both" — split by script so both kinds of questions are produced.
      options.hiraganaSubset = subset.filter(
        (p) =>
          p.kana >= "ぁ" && p.kana <= "ゖ", // hiragana unicode block
      );
      options.katakanaSubset = subset.filter(
        (p) => p.kana >= "ァ" && p.kana <= "ヺ", // katakana unicode block
      );
    }
  }

  // Apply kanji subset filter (lets users limit to a small group later).
  if (mode === "kanji" && Array.isArray(kanjiChars) && kanjiChars.length > 0) {
    options.kanjiSubset = N5_KANJI.filter((k) => kanjiChars.includes(k.char));
    if (options.kanjiSubset.length === 0) {
      return NextResponse.json(
        { error: "Selected kanji produced an empty set" },
        { status: 400 },
      );
    }
  }

  const questions = generateQuestions(count, mode, words, options);
  return NextResponse.json({ questions });
}
