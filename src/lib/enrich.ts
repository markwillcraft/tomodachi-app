import { toHiragana, toKatakana } from "wanakana";
import { translateBatch } from "./gemini";

export type EnrichedWord = {
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  needsReview: boolean;
};

export async function enrichRomajiList(
  romajiList: string[],
): Promise<EnrichedWord[]> {
  const cleaned = romajiList
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);

  const unique = Array.from(new Set(cleaned));

  const base = unique.map((r) => ({
    romaji: r,
    hiragana: toHiragana(r),
    katakana: toKatakana(r),
  }));

  const translations = await translateBatch(base.map((b) => b.hiragana));

  return base.map((b, i) => {
    const english = (translations[i] ?? "").trim();
    return {
      ...b,
      english,
      needsReview: english.length === 0,
    };
  });
}
