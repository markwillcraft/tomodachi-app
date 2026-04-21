export type KanaPair = { kana: string; romaji: string };

export const HIRAGANA: KanaPair[] = [
  { kana: "あ", romaji: "a" }, { kana: "い", romaji: "i" }, { kana: "う", romaji: "u" }, { kana: "え", romaji: "e" }, { kana: "お", romaji: "o" },
  { kana: "か", romaji: "ka" }, { kana: "き", romaji: "ki" }, { kana: "く", romaji: "ku" }, { kana: "け", romaji: "ke" }, { kana: "こ", romaji: "ko" },
  { kana: "さ", romaji: "sa" }, { kana: "し", romaji: "shi" }, { kana: "す", romaji: "su" }, { kana: "せ", romaji: "se" }, { kana: "そ", romaji: "so" },
  { kana: "た", romaji: "ta" }, { kana: "ち", romaji: "chi" }, { kana: "つ", romaji: "tsu" }, { kana: "て", romaji: "te" }, { kana: "と", romaji: "to" },
  { kana: "な", romaji: "na" }, { kana: "に", romaji: "ni" }, { kana: "ぬ", romaji: "nu" }, { kana: "ね", romaji: "ne" }, { kana: "の", romaji: "no" },
  { kana: "は", romaji: "ha" }, { kana: "ひ", romaji: "hi" }, { kana: "ふ", romaji: "fu" }, { kana: "へ", romaji: "he" }, { kana: "ほ", romaji: "ho" },
  { kana: "ま", romaji: "ma" }, { kana: "み", romaji: "mi" }, { kana: "む", romaji: "mu" }, { kana: "め", romaji: "me" }, { kana: "も", romaji: "mo" },
  { kana: "や", romaji: "ya" }, { kana: "ゆ", romaji: "yu" }, { kana: "よ", romaji: "yo" },
  { kana: "ら", romaji: "ra" }, { kana: "り", romaji: "ri" }, { kana: "る", romaji: "ru" }, { kana: "れ", romaji: "re" }, { kana: "ろ", romaji: "ro" },
  { kana: "わ", romaji: "wa" }, { kana: "を", romaji: "wo" }, { kana: "ん", romaji: "n" },
  { kana: "が", romaji: "ga" }, { kana: "ぎ", romaji: "gi" }, { kana: "ぐ", romaji: "gu" }, { kana: "げ", romaji: "ge" }, { kana: "ご", romaji: "go" },
  { kana: "ざ", romaji: "za" }, { kana: "じ", romaji: "ji" }, { kana: "ず", romaji: "zu" }, { kana: "ぜ", romaji: "ze" }, { kana: "ぞ", romaji: "zo" },
  { kana: "だ", romaji: "da" }, { kana: "ぢ", romaji: "ji" }, { kana: "づ", romaji: "zu" }, { kana: "で", romaji: "de" }, { kana: "ど", romaji: "do" },
  { kana: "ば", romaji: "ba" }, { kana: "び", romaji: "bi" }, { kana: "ぶ", romaji: "bu" }, { kana: "べ", romaji: "be" }, { kana: "ぼ", romaji: "bo" },
  { kana: "ぱ", romaji: "pa" }, { kana: "ぴ", romaji: "pi" }, { kana: "ぷ", romaji: "pu" }, { kana: "ぺ", romaji: "pe" }, { kana: "ぽ", romaji: "po" },
];

export const KATAKANA: KanaPair[] = [
  { kana: "ア", romaji: "a" }, { kana: "イ", romaji: "i" }, { kana: "ウ", romaji: "u" }, { kana: "エ", romaji: "e" }, { kana: "オ", romaji: "o" },
  { kana: "カ", romaji: "ka" }, { kana: "キ", romaji: "ki" }, { kana: "ク", romaji: "ku" }, { kana: "ケ", romaji: "ke" }, { kana: "コ", romaji: "ko" },
  { kana: "サ", romaji: "sa" }, { kana: "シ", romaji: "shi" }, { kana: "ス", romaji: "su" }, { kana: "セ", romaji: "se" }, { kana: "ソ", romaji: "so" },
  { kana: "タ", romaji: "ta" }, { kana: "チ", romaji: "chi" }, { kana: "ツ", romaji: "tsu" }, { kana: "テ", romaji: "te" }, { kana: "ト", romaji: "to" },
  { kana: "ナ", romaji: "na" }, { kana: "ニ", romaji: "ni" }, { kana: "ヌ", romaji: "nu" }, { kana: "ネ", romaji: "ne" }, { kana: "ノ", romaji: "no" },
  { kana: "ハ", romaji: "ha" }, { kana: "ヒ", romaji: "hi" }, { kana: "フ", romaji: "fu" }, { kana: "ヘ", romaji: "he" }, { kana: "ホ", romaji: "ho" },
  { kana: "マ", romaji: "ma" }, { kana: "ミ", romaji: "mi" }, { kana: "ム", romaji: "mu" }, { kana: "メ", romaji: "me" }, { kana: "モ", romaji: "mo" },
  { kana: "ヤ", romaji: "ya" }, { kana: "ユ", romaji: "yu" }, { kana: "ヨ", romaji: "yo" },
  { kana: "ラ", romaji: "ra" }, { kana: "リ", romaji: "ri" }, { kana: "ル", romaji: "ru" }, { kana: "レ", romaji: "re" }, { kana: "ロ", romaji: "ro" },
  { kana: "ワ", romaji: "wa" }, { kana: "ヲ", romaji: "wo" }, { kana: "ン", romaji: "n" },
  { kana: "ガ", romaji: "ga" }, { kana: "ギ", romaji: "gi" }, { kana: "グ", romaji: "gu" }, { kana: "ゲ", romaji: "ge" }, { kana: "ゴ", romaji: "go" },
  { kana: "ザ", romaji: "za" }, { kana: "ジ", romaji: "ji" }, { kana: "ズ", romaji: "zu" }, { kana: "ゼ", romaji: "ze" }, { kana: "ゾ", romaji: "zo" },
  { kana: "ダ", romaji: "da" }, { kana: "ヂ", romaji: "ji" }, { kana: "ヅ", romaji: "zu" }, { kana: "デ", romaji: "de" }, { kana: "ド", romaji: "do" },
  { kana: "バ", romaji: "ba" }, { kana: "ビ", romaji: "bi" }, { kana: "ブ", romaji: "bu" }, { kana: "ベ", romaji: "be" }, { kana: "ボ", romaji: "bo" },
  { kana: "パ", romaji: "pa" }, { kana: "ピ", romaji: "pi" }, { kana: "プ", romaji: "pu" }, { kana: "ペ", romaji: "pe" }, { kana: "ポ", romaji: "po" },
];

// Row-by-row groups so the kana quiz can offer "ka,ki,ku,ke,ko" toggles.
// Each id is stable and matches across hiragana/katakana so the quiz UI
// can flip script without losing the user's selection.
export type KanaGroup = {
  id: string;
  label: string;
  // Romaji for each cell in the row, used as the lookup key into the kana
  // tables above.
  romaji: string[];
  type: "gojuon" | "dakuten" | "handakuten";
};

export const KANA_GROUPS: KanaGroup[] = [
  { id: "a", label: "a, i, u, e, o", romaji: ["a", "i", "u", "e", "o"], type: "gojuon" },
  { id: "k", label: "ka, ki, ku, ke, ko", romaji: ["ka", "ki", "ku", "ke", "ko"], type: "gojuon" },
  { id: "s", label: "sa, shi, su, se, so", romaji: ["sa", "shi", "su", "se", "so"], type: "gojuon" },
  { id: "t", label: "ta, chi, tsu, te, to", romaji: ["ta", "chi", "tsu", "te", "to"], type: "gojuon" },
  { id: "n", label: "na, ni, nu, ne, no", romaji: ["na", "ni", "nu", "ne", "no"], type: "gojuon" },
  { id: "h", label: "ha, hi, fu, he, ho", romaji: ["ha", "hi", "fu", "he", "ho"], type: "gojuon" },
  { id: "m", label: "ma, mi, mu, me, mo", romaji: ["ma", "mi", "mu", "me", "mo"], type: "gojuon" },
  { id: "y", label: "ya, yu, yo", romaji: ["ya", "yu", "yo"], type: "gojuon" },
  { id: "r", label: "ra, ri, ru, re, ro", romaji: ["ra", "ri", "ru", "re", "ro"], type: "gojuon" },
  { id: "w", label: "wa, wo, n", romaji: ["wa", "wo", "n"], type: "gojuon" },
  { id: "g", label: "ga, gi, gu, ge, go", romaji: ["ga", "gi", "gu", "ge", "go"], type: "dakuten" },
  { id: "z", label: "za, ji, zu, ze, zo", romaji: ["za", "ji", "zu", "ze", "zo"], type: "dakuten" },
  { id: "d", label: "da, de, do", romaji: ["da", "de", "do"], type: "dakuten" },
  { id: "b", label: "ba, bi, bu, be, bo", romaji: ["ba", "bi", "bu", "be", "bo"], type: "dakuten" },
  { id: "p", label: "pa, pi, pu, pe, po", romaji: ["pa", "pi", "pu", "pe", "po"], type: "handakuten" },
];

// Lookup helpers used by the quiz to filter to the user's chosen rows /
// scripts. Returns deduped pairs to avoid duplicate questions when the
// same romaji appears in both hiragana/katakana for "both" scripts.
export type KanaScript = "hiragana" | "katakana" | "both";

export function getKanaForGroups(
  groupIds: string[],
  script: KanaScript,
): KanaPair[] {
  const wantedRomaji = new Set(
    KANA_GROUPS.filter((g) => groupIds.includes(g.id)).flatMap((g) => g.romaji),
  );
  const out: KanaPair[] = [];
  if (script === "hiragana" || script === "both") {
    for (const k of HIRAGANA) if (wantedRomaji.has(k.romaji)) out.push(k);
  }
  if (script === "katakana" || script === "both") {
    for (const k of KATAKANA) if (wantedRomaji.has(k.romaji)) out.push(k);
  }
  return out;
}
