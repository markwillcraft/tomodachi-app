import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

function getModel() {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env (see .env.example).",
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" },
  });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not parse JSON from Gemini response");
  }
}

export type EnrichedRomajiResult = {
  // The user's input romaji, possibly with spaces inserted between words
  // (e.g. "douzoyoroshiku" -> "douzo yoroshiku").
  romaji: string;
  // Concise English meaning (max ~4 words). Empty string if unknown.
  english: string;
};

/**
 * Asks Gemini to (1) split run-on romaji into properly spaced words and
 * (2) translate each entry to English in one round trip. We ask for both
 * at once so a single API call handles enrichment.
 */
export async function enrichRomajiBatch(
  romajiInputs: string[],
): Promise<EnrichedRomajiResult[]> {
  if (romajiInputs.length === 0) return [];

  const model = getModel();
  const prompt = `You are a Japanese language assistant.

For each input romaji string, return a JSON object with two fields:
- "romaji": the same input rewritten in Hepburn romaji with proper word
  spacing inserted between Japanese words. Examples:
    "douzoyoroshiku" -> "douzo yoroshiku"
    "ohayougozaimasu" -> "ohayou gozaimasu"
    "watashi" -> "watashi"
  Keep all macrons/long vowels exactly as the user wrote them (e.g.
  "ou" stays "ou", "uu" stays "uu"). Do not add or remove any letters.
  Lowercase only.
- "english": concise English meaning (max 4 words). Empty string "" if
  you do not know the word.

Return ONLY a JSON array of these objects in the same order as the input.

Input (JSON):
${JSON.stringify(romajiInputs)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJson(text);
    if (!Array.isArray(parsed)) throw new Error("Expected an array");
    return romajiInputs.map((input, i) => {
      const v = parsed[i];
      if (v && typeof v === "object") {
        const obj = v as { romaji?: unknown; english?: unknown };
        const romaji =
          typeof obj.romaji === "string" && obj.romaji.trim().length > 0
            ? obj.romaji.trim().toLowerCase()
            : input;
        const english =
          typeof obj.english === "string" ? obj.english.trim() : "";
        return { romaji, english };
      }
      return { romaji: input, english: "" };
    });
  } catch (err) {
    console.error("Gemini enrichRomajiBatch failed:", err);
    return romajiInputs.map((r) => ({ romaji: r, english: "" }));
  }
}

// Older API kept for callers that only want translations of hiragana words.
// New code should prefer enrichRomajiBatch above.
export async function translateBatch(
  hiraganaWords: string[],
): Promise<string[]> {
  if (hiraganaWords.length === 0) return [];

  const model = getModel();
  const prompt = `You are a Japanese-to-English translator.
Return ONLY a JSON array of strings, one per input word, in the same order.
Each string is a concise English meaning (max 4 words). If unknown, return an empty string "".

Input words (JSON):
${JSON.stringify(hiraganaWords)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJson(text);
    if (!Array.isArray(parsed)) throw new Error("Expected an array");
    return hiraganaWords.map((_, i) => {
      const v = parsed[i];
      return typeof v === "string" ? v : "";
    });
  } catch (err) {
    console.error("Gemini translateBatch failed:", err);
    return hiraganaWords.map(() => "");
  }
}

export type ProgressSummary = {
  totalAnswered: number;
  totalCorrect: number;
  accuracyByMode: Record<string, { correct: number; total: number }>;
  weakestWords: Array<{
    romaji: string;
    hiragana: string;
    english: string;
    correct: number;
    total: number;
  }>;
};

export async function generateTips(summary: ProgressSummary): Promise<string[]> {
  const model = getModel();
  const accuracy =
    summary.totalAnswered > 0
      ? Math.round((summary.totalCorrect / summary.totalAnswered) * 100)
      : 0;

  const prompt = `You are a friendly Japanese language coach.
Based on the learner's stats, return ONLY a JSON array of 3 to 5 short, concrete study tips (each under 25 words).
Focus on actionable practice ideas tied to their weakest words and modes. No greetings, no preamble.

Stats:
- Overall accuracy: ${accuracy}% (${summary.totalCorrect}/${summary.totalAnswered})
- Accuracy by mode: ${JSON.stringify(summary.accuracyByMode)}
- Weakest words: ${JSON.stringify(summary.weakestWords)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJson(text);
    if (!Array.isArray(parsed)) throw new Error("Expected an array");
    return parsed.filter((t): t is string => typeof t === "string").slice(0, 5);
  } catch (err) {
    console.error("Gemini generateTips failed:", err);
    return [
      "Could not load AI tips right now. Try again in a moment.",
    ];
  }
}
