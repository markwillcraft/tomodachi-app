// =====================================================================
// Japanese romaji helpers
// ---------------------------------------------------------------------
// Used by the Dojo vocab flip card to render colored per-mora romaji
// underneath each kana character — turns わたし into わ(wa) た(ta)
// し(shi) so a learner can sound the word out without flipping the
// card or breaking gaze on the kanji.
//
// Two responsibilities:
//
//   * `splitMora(kana)` — segment a kana string into reading units
//     (mora) so digraphs like しゃ / ちょ stay together as one
//     pronounced sound, sokuon (small っ) attaches to the next mora,
//     and the moraic n (ん / ン) renders on its own.
//
//   * `kanaToRomaji(mora)` — Hepburn romaji for a single mora.
//     Returns the input unchanged if it isn't recognised (e.g. a
//     stray ASCII char inside a katakana loanword) so render code
//     can stay dumb.
//
// We deliberately reuse the canonical hiragana + katakana tables from
// `kana.ts` so there's only ever one place to fix a typo. Digraphs
// (yōon / 拗音) live here because no other feature needs them yet.
//
// Kept on the small side — Hepburn romanisation, no macrons (long
// vowels render as "uu", "ou" so each mora keeps a 1:1 mapping with
// its kana char). That's the right trade-off for a learning aid:
// a beginner reads "ohayou" more easily than "ohayō".
// =====================================================================

import { HIRAGANA, KATAKANA } from "./kana";

// Hiragana yōon (digraphs). Built by combining a CV-i kana with a
// small ya/yu/yo. Hepburn collapses sh/ch/j to keep palatal
// pronunciations spelled phonetically: しゃ → sha, not shya.
const HIRAGANA_DIGRAPHS: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja",  じゅ: "ju",  じょ: "jo",
  ぢゃ: "ja",  ぢゅ: "ju",  ぢょ: "jo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
};

// Katakana yōon. Same shape as hiragana plus a few common loanword
// extensions (ファ/フィ/フェ/フォ for "fa/fi/fe/fo", ティ for "ti",
// etc.) so things like カフェ / パーティー render sensibly.
const KATAKANA_DIGRAPHS: Record<string, string> = {
  キャ: "kya", キュ: "kyu", キョ: "kyo",
  シャ: "sha", シュ: "shu", ショ: "sho",
  チャ: "cha", チュ: "chu", チョ: "cho",
  ニャ: "nya", ニュ: "nyu", ニョ: "nyo",
  ヒャ: "hya", ヒュ: "hyu", ヒョ: "hyo",
  ミャ: "mya", ミュ: "myu", ミョ: "myo",
  リャ: "rya", リュ: "ryu", リョ: "ryo",
  ギャ: "gya", ギュ: "gyu", ギョ: "gyo",
  ジャ: "ja",  ジュ: "ju",  ジョ: "jo",
  ヂャ: "ja",  ヂュ: "ju",  ヂョ: "jo",
  ビャ: "bya", ビュ: "byu", ビョ: "byo",
  ピャ: "pya", ピュ: "pyu", ピョ: "pyo",
  // Loanword extensions.
  ファ: "fa",  フィ: "fi",  フェ: "fe",  フォ: "fo",
  ティ: "ti",  ディ: "di",  トゥ: "tu",  ドゥ: "du",
  ウィ: "wi",  ウェ: "we",  ウォ: "wo",
  ヴァ: "va",  ヴィ: "vi",  ヴェ: "ve",  ヴォ: "vo",  ヴ: "vu",
  チェ: "che", シェ: "she", ジェ: "je",
};

// Single-kana → romaji lookup. Built once at module load by folding
// the canonical kana tables and the digraph maps into a single
// Map<string, string>. Map (vs object) gives slightly cleaner
// has/get semantics and no accidental prototype hits.
const ROMAJI_LOOKUP: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const { kana, romaji } of HIRAGANA) map.set(kana, romaji);
  for (const { kana, romaji } of KATAKANA) map.set(kana, romaji);
  for (const [kana, romaji] of Object.entries(HIRAGANA_DIGRAPHS)) map.set(kana, romaji);
  for (const [kana, romaji] of Object.entries(KATAKANA_DIGRAPHS)) map.set(kana, romaji);
  return map;
})();

// Small-y kana that combine with the previous CV-i kana to form a
// digraph (拗音). When we see one of these we glue it to the previous
// char in `splitMora` so the pair surfaces as a single mora.
const SMALL_Y = new Set(["ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ", "ァ", "ィ", "ェ", "ォ", "ゥ"]);

// Sokuon (small っ / ッ). Phonetically a doubling of the *next*
// consonant rather than its own sound, so we attach it to the
// following mora instead of treating it as a standalone unit. That
// way a learner sees `きって` as `き って` (ki + tte) — two
// pronunciation beats — instead of `き っ て`.
const SOKUON = new Set(["っ", "ッ"]);

// Long-vowel mark (chōonpu) used in katakana loanwords. Render as
// "ー" with its own colored cell rather than try to merge into the
// previous mora — that keeps the romaji readable (コーヒー stays
// "ko ー hi ー" instead of being silently absorbed).
const CHOONPU = "ー";

/**
 * Split a kana string into reading units (mora). Each entry in the
 * returned array is one beat the user pronounces.
 *
 * Rules:
 *   * digraph (CV-i + small y/etc.) — joined into one mora
 *   * sokuon (small つ) — joined to the FOLLOWING mora
 *   * chōonpu (ー) — kept as its own cell so the romaji row stays
 *     visually aligned with the kana row 1:1
 *   * unrecognised chars — yielded as a single-char "mora" so the
 *     render code can show them verbatim (defensive against typos)
 *
 * Stays string-only and pure — safe to call from server/client.
 */
export function splitMora(kana: string): string[] {
  const out: string[] = [];
  const chars = Array.from(kana); // surrogate-safe iteration
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];

    // Sokuon: glue onto the next char if there is one. If it's the
    // last char of the string (rare, usually a typo) just emit it
    // as its own cell so the user at least sees what was authored.
    if (SOKUON.has(ch) && i + 1 < chars.length) {
      const next = chars[i + 1];
      // The next mora may itself be a digraph (e.g. っちゃ → tcha).
      const after = chars[i + 2];
      if (after && SMALL_Y.has(after)) {
        out.push(ch + next + after);
        i += 3;
        continue;
      }
      out.push(ch + next);
      i += 2;
      continue;
    }

    // Digraph: current char + a small-y follower → one mora.
    const next = chars[i + 1];
    if (next && SMALL_Y.has(next)) {
      out.push(ch + next);
      i += 2;
      continue;
    }

    out.push(ch);
    i += 1;
  }
  return out;
}

/**
 * Hepburn romaji for a single mora (as produced by `splitMora`).
 * Returns the input unchanged if we don't have a mapping — that
 * way render code can blindly call it without first checking
 * whether the char is kana, and we degrade gracefully to "show
 * the character verbatim" instead of throwing.
 *
 * Sokuon doubling is handled here too: a leading っ/ッ doubles
 * the first consonant of the rest (きって → kit-te). For a
 * leading-vowel double (rare, e.g. っあ) we drop the sokuon since
 * Hepburn has no consonant to double.
 */
export function kanaToRomaji(mora: string): string {
  if (mora === CHOONPU) return mora;

  // Sokuon prefix: doubled consonant.
  const head = mora.charAt(0);
  if (SOKUON.has(head) && mora.length > 1) {
    const rest = mora.slice(1);
    const restRomaji = ROMAJI_LOOKUP.get(rest) ?? rest;
    if (restRomaji.length === 0) return restRomaji;
    const first = restRomaji.charAt(0);
    // ch* → tch* per Hepburn (e.g. まっちゃ → matcha).
    if (restRomaji.startsWith("ch")) return "t" + restRomaji;
    // Vowel-initial: nothing to double, just drop the sokuon.
    if ("aeiou".includes(first)) return restRomaji;
    return first + restRomaji;
  }

  return ROMAJI_LOOKUP.get(mora) ?? mora;
}
