# Grammar quiz (sentence arrange)

> **Status:** Proposed  
> **Priority:** P1 · **Effort:** L · **Depends on:** —

## Why

Vocab, kana, and kanji quizzes reinforce recall, but they do not train **sentence construction**. A Duolingo-style **word-bank arrange** flow (full blank prompt, tap tiles into order) trains particles, word order, and grammar patterns in a tight loop.

## Goals / non-goals

**In (MVP):**

- New launcher at `/quiz/grammar` with **Ranked** and **Training** (same semantics as other quiz launchers: Ranked → `POST /api/quiz/submit`; Training → local practice only, no server streak/progress).
- **Sentence arrange:** construction zone + shuffled word bank (correct tokens + **distractors**).
- **Filter** by JLPT level and/or grammar pattern on the setup screen (start with N5).
- **Count cap** server-side to the size of the filtered question pool (same idea as vocab category cap).
- Reuse existing quiz pipeline: `sessionStorage["quiz"]`, `/quiz/play`, generate + submit APIs.

**Out of MVP:**

- Free-form Japanese typing / IME grading.
- Drag-and-drop reorder (tap-to-place / tap-to-remove only).
- TTS for arbitrary assembled sentences.
- Auto-tokenizing Dojo example strings; **author a dedicated tokenized bank** instead.
- N4+ content can wait; schema can allow `level: "N4"` when ready.

## UX flow

1. User opens `/quiz/grammar`, picks count, Ranked or Training, and optional level/pattern chips.
2. **Start** → `POST /api/quiz/generate` with `{ mode: "grammar", count, grammarFilter? }`.
3. On `/quiz/play`, each item shows English prompt (+ optional pattern label), empty construction zone, and word bank.
4. User taps tiles into the zone, taps **Check**; feedback + optional explanation.
5. Ranked run submits to `POST /api/quiz/submit`; Training clears local session without server submit.

## Content source

New file: `src/lib/grammar-questions.ts` — typed corpus, not scraped from `src/lib/dojo-content.ts` (Dojo examples are flat `jp` / `romaji` / `en` strings, not reliable token arrays).

Sketch:

```ts
export type GrammarToken = {
  jp: string;
  furigana?: string;
  romaji: string;
};

export type GrammarQuestion = {
  id: string;
  patternId: string; // stable SRS key, e.g. "n5_wa_desu"
  patternLabel: string; // e.g. "～は～です"
  level: "N5" | "N4";
  promptEn: string;
  tokens: GrammarToken[]; // correct order
  distractors?: GrammarToken[];
  explanation?: string;
};
```

## Data model (MVP)

No new Prisma tables required.

- `QuizAttempt` + `QuestionResult` as today; grammar rows can use `wordId: null` (same pattern as Dojo section drills).
- **SRS:** extend `itemFromResult` / `ReviewState` to support `itemType: "grammar"` with `itemKey = patternId` (implementation detail in `src/lib/srs.ts`).

## API surface

| Endpoint | Change |
|----------|--------|
| `POST /api/quiz/generate` | Add `mode: "grammar"`; optional `grammarFilter: { level?, patternId? }`; cap `count` to pool; return `effectiveCount`. |
| `POST /api/quiz/submit` | Accept optional `patternId` per result for grammar SRS mapping. |

## Planned source files

- `src/lib/grammar-questions.ts` — corpus + helpers (`getQuestionsByFilter`, etc.).
- `src/lib/quiz.ts` — `QuizMode` / `QuestionKind` + grammar arrange builder.
- `src/app/api/quiz/generate/route.ts` — grammar branch.
- `src/app/quiz/grammar/page.tsx`, `grammar-quiz-form.tsx` — launcher.
- `src/app/quiz/page.tsx` — hub tile.
- `src/app/quiz/play/page.tsx` — arrange UI + Check (non–multiple-choice path).
- `src/app/api/quiz/submit/route.ts`, `src/lib/srs.ts` — grammar + SRS wiring.
- `src/lib/achievements.ts` — optional grammar milestones.

## Fun / polish (post-MVP or stretch)

- Hint chip (reveal first tile) with clear SRS/coins rules.
- Per-pattern mastery badges on picker chips.
- Streak callouts within a single attempt.
- “Redo missed” for grammar only (mirror vocab redo flow).

## Open questions

- Hint policy: no SRS vs reduced coins vs allowed everywhere.
- Fixed vs adaptive distractor count by sentence length.
- Always show `patternLabel` vs hide on Ranked for difficulty.

## When this ships: README touchpoints

Per `.cursor/rules/readme-maintenance.mdc`:

- `## Feature reference` → `### Grammar quiz` (launcher, arrange mechanic, filters, Ranked/Training).
- `## API surface` → `POST /api/quiz/generate` grammar mode + `grammarFilter`.
- `## Data model` or SRS notes → `grammar` `itemType` on `ReviewState`.
- Bottom source-of-truth table → `src/lib/grammar-questions.ts`.
