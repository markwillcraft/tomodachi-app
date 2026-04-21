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
