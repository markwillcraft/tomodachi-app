import { toHiragana, toKatakana } from "wanakana";
import { enrichRomajiBatch } from "./gemini";

export type EnrichedWord = {
  // Properly spaced romaji ("douzo yoroshiku") suitable for display.
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
  if (unique.length === 0) return [];

  // One Gemini call gets us properly-spaced romaji AND English meanings,
  // which is what we want before deriving the kana.
  const enriched = await enrichRomajiBatch(unique);

  return enriched.map((e) => {
    // wanakana ignores spaces when converting, so spaced romaji like
    // "douzo yoroshiku" still becomes "どうぞよろしく" cleanly.
    const hiragana = toHiragana(e.romaji.replace(/\s+/g, ""));
    const katakana = toKatakana(e.romaji.replace(/\s+/g, ""));
    return {
      romaji: e.romaji,
      hiragana,
      katakana,
      english: e.english,
      needsReview: e.english.length === 0,
    };
  });
}
