// Practice History — stored locally in the browser. Training-mode quiz
// results aren't sent to the server (so they don't move the streak or
// progress charts), but we still log them here so users can scroll back
// through their drilling sessions.

const STORAGE_KEY = "practice_history_v1";
const MAX_ENTRIES = 50;

export type PracticeMode = "vocab" | "hiragana" | "katakana" | "kanji";

export type PracticeSession = {
  id: string;
  startedAt: number;
  finishedAt: number;
  mode: PracticeMode | string;
  total: number;
  correct: number;
  wrong: number;
  // Optional roll-up of which kinds appeared, for richer history rows.
  kinds?: Record<string, { total: number; correct: number }>;
};

function read(): PracticeSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PracticeSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function write(items: PracticeSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function getPracticeHistory(): PracticeSession[] {
  return read().sort((a, b) => b.finishedAt - a.finishedAt);
}

export function addPracticeSession(session: PracticeSession): void {
  const items = read();
  items.push(session);
  items.sort((a, b) => b.finishedAt - a.finishedAt);
  write(items.slice(0, MAX_ENTRIES));
}

export function clearPracticeHistory(): void {
  write([]);
}

export function modeLabel(mode: string): string {
  switch (mode) {
    case "vocab":
      return "Vocabulary";
    case "hiragana":
      return "Hiragana";
    case "katakana":
      return "Katakana";
    case "kanji":
      return "Kanji";
    default:
      return mode;
  }
}
