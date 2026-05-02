# Tomodachi — Japanese Study Buddy

A self-hosted, multi-tenant JLPT N5 study app built on Next.js 16 (App Router).
Sign in with Clerk, build vocab from a curated catalog or your own imports, and
drill yourself with timed quizzes, kanji stroke-order practice, kana drills, and
grammar lessons. The app gamifies learning with a streak, a coin economy, daily
quests, achievements, and an SRS scheduler — all so the next session feels worth
opening.

This README is the canonical reference for everything the app does and *how* it
does it. If you change behavior in code, update the matching section here.

---

## Table of contents

1. [Stack](#stack)
2. [Local setup](#local-setup)
3. [Deploy to Vercel](#deploy-to-vercel)
4. [Feature reference](#feature-reference)
   - [Authentication & multi-tenancy](#authentication--multi-tenancy)
   - [Vocabulary library](#vocabulary-library)
   - [Dojo (guided curriculum)](#dojo-guided-curriculum)
   - [Self-study](#self-study)
   - [Quiz engine](#quiz-engine)
   - [Spaced Repetition (SRS)](#spaced-repetition-srs)
   - [Streak & daily goal](#streak--daily-goal)
   - [Streak Freeze](#streak-freeze)
   - [Coins](#coins)
   - [Daily quests](#daily-quests)
   - [Achievements](#achievements)
   - [N5 Mastery paths](#n5-mastery-paths)
   - [Quick Actions](#quick-actions)
   - [Progress page](#progress-page)
   - [Settings & timezone](#settings--timezone)
   - [Shop & Inventory](#shop--inventory)
   - [In-app notifications](#in-app-notifications)
5. [Data model](#data-model)
6. [API surface](#api-surface)
7. [Rate limiting & abuse protection](#rate-limiting--abuse-protection)
8. [Performance notes](#performance-notes)
9. [Conventions](#conventions)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Components by default) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives, lucide-react icons) |
| Japanese typography | **Noto Sans JP** via `next/font/google` (self-hosted; replaces remote Google Fonts `<link>` tags so the browser does not log “preloaded … not used” for font subresources) |
| Auth | **Clerk** (`@clerk/nextjs`) — Google / email / magic links |
| DB | **Postgres** via **Prisma** ORM. Neon (serverless) recommended in prod |
| AI | **Google Gemini** (`gemini-flash-latest`) for romaji enrichment; study-tips API at `POST /api/progress/tips` (no in-app UI yet — see [roadmap 09](.cursor/docs/roadmap/09-tiers-and-trial.md)) |
| Romaji ↔ kana | `wanakana` |
| Charts | `recharts` |
| Speech | Browser Web Speech API (`speechSynthesis`) |
| Top-loader | `nextjs-toploader` |

---

## Local setup

You need three free accounts:

1. **Postgres** — easiest is [Neon](https://neon.tech). Create a project, copy the
   pooled connection string.
2. **Clerk** — [dashboard.clerk.com](https://dashboard.clerk.com) → create an
   application → enable Google + email. Copy the **Publishable** and **Secret**
   keys from API Keys.
3. **Gemini** — [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

Then:

```bash
npm install
cp .env.example .env
# Fill in:
#   DATABASE_URL
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#   CLERK_SECRET_KEY
#   GEMINI_API_KEY
#   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (optional in dev)
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

> `npx prisma db seed` populates the `ReadingWord` table that powers the
> Hiragana / Katakana quiz Reading mode. The seed is **idempotent** —
> safe to re-run after pulls — and uses `createMany({ skipDuplicates:
> true })` keyed on `(stage, dayOfCycle, sortIndex)` so any future
> admin-edited rows survive subsequent seeds (see roadmap 12).

Open <http://localhost:3000>, click **Sign up**, and you're in.

> First-run tip: visit **N5 Categories** and "Add all" — you'll have a working
> vocabulary library in one click.

> Upstash Redis is **optional in local dev** — `src/lib/rate-limit.ts`
> becomes a no-op when its env vars are missing. It is **required in
> production** to cap LLM costs and protect Postgres from runaway
> scripts. Free tier (10k commands/day) covers ~5k DAU. See the
> [Rate limiting](#rate-limiting--abuse-protection) section.

---

## Deploy to Vercel

1. Push to GitHub.
2. **New Project** → import the repo on Vercel.
3. Add env vars in **Project Settings → Environment Variables**:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
   - `GEMINI_API_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — **required**
     in prod. Create a free Redis at <https://console.upstash.com>.
4. **Clerk dashboard → Domains** — add your `*.vercel.app` (and a custom
   domain if you have one). For Google sign-in in production, list the domain
   on the Google OAuth consent screen too.
5. `prisma generate` runs automatically via `postinstall`. Run migrations
   against the prod DB once:

   ```bash
   DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
   ```

---

## Feature reference

### Authentication & multi-tenancy

- **Clerk** owns the user record (Google OAuth, email, magic links — anything you
  enable on the dashboard). The app never stores PII locally.
- Every domain table has a `userId` column holding the Clerk id (`user_2abc…`).
  All API handlers funnel through `requireUserId()` (`src/lib/auth-utils.ts`)
  before any DB read or write.
- Middleware in `src/middleware.ts` gates protected routes; unauthenticated
  visitors land on `/sign-in`.
- **Optional**: hook a Clerk webhook at `/api/webhooks/clerk` to delete a user's
  rows when the user is deleted in Clerk. Without it, deleted-user data lingers
  in Postgres but is unreachable.

### Vocabulary library

Three ways to build your library, all writing to the `Word` table:

1. **N5 Categories** (`/categories`). A static catalog (`src/lib/categories.ts`)
   of JLPT N5 vocab grouped by theme — Greetings, Numbers, Days & Time, Family,
   Colors, Food & Drink, Places, Verbs, Adjectives, Pronouns, etc. Pick any
   category or "Add all" — these become an `ImportBatch` with `source = "category"`.
2. **Bulk import** (`/import`). Paste or upload a `.txt` of romaji lines.
   Gemini enriches each line into `{ romaji, hiragana, katakana, english }`
   via `src/lib/enrich.ts`. Failures fall back to `wanakana` for the kana
   conversion. Tracked as `source = "import"`. The page itself
   (`src/app/import/page.tsx`) is a Server Component that pre-loads the
   library via Prisma; the client island (`import-client.tsx`) handles
   the textarea, edits, and deletes through `apiFetch` and triggers a
   `router.refresh()` after each mutation so the server-rendered list
   re-runs with fresh data.
3. **Inline edits** anywhere a vocab card is shown.

Words are deduped per user via `@@unique([userId, romaji])`.

### Dojo (guided curriculum)

The Dojo (`/dojo`) is the *guided* counterpart to Self-study. Where
Self-study lets the learner pick any drill freely, the Dojo walks them
through a curated curriculum based on **Genki I + II** (3rd ed., The Japan
Times). Lessons are grouped into JLPT paths (N5 = Genki I lessons 1–12,
N4 = Genki II lessons 13–23) and each lesson advertises three sections,
in the order they're meant to be tackled: **Vocab**, **Grammar**, and
**Listening**. Vocab leads because the kanji and example sentences in
the Grammar drill all reuse the lesson's vocab, so familiarising
yourself with the words first makes the grammar section land cleanly.

We deliberately do **not** mix Genki and Minna no Nihongo — their grammar
ordering, vocabulary sets, and pedagogical assumptions disagree, and
combining them would teach learners contradictory canonical forms. Genki
was picked because it's built for self-study with bilingual scaffolding
and maps cleanly to JLPT levels.

- **Sensei header** — `/Dachi-sensei.png` mascot in a soft tatami spotlight
  with an in-character welcome script and roll-up totals (paths open,
  lessons, vocab/grammar/listening counts). Sets the "you have a teacher"
  tone for the page.
- **Path selector** — horizontal chips, one per JLPT level, with a
  per-path icon (Sparkles for N5, Trophy for N4). N5 is open from day
  one; N4 ships **fully authored but gated** behind a runtime
  `prerequisite` (`{ kind: "level-complete", level: "n5" }` on the
  N4 path). Until the user has passed every section of every N5
  lesson, N4 renders in a *preview* state — the tile shows a
  "Complete N5 to unlock drills" subtitle, lesson cards remain
  clickable so users can read the lesson view, but section drills
  redirect back with a "Preview mode" banner. The gate is enforced in
  three places that share one helper: the `/dojo` RSC
  (`getPrereqMetByLevel`), the `/dojo/[level]/[lessonId]/[section]`
  + `…/drill` RSCs (`isPathPrereqMet`), and `submitDojoSection` on
  the API surface (throws `DojoPrereqUnmetError`, mapped to a 403).
- **Lesson grid** — responsive 1→2→3→4 columns. Each card has a tight
  vertical hierarchy: number badge + title + italic theme line at the
  top, the one-line summary as the lead, a quiet "Covers" caption with
  the highlight grammar points dot-separated, and an inline section
  meter (icon + count for Vocab / Grammar / Listening). Cards are
  `<Link>`s to the lesson detail route — locked lessons render as
  non-clickable dashed-border tiles instead.
- **Lesson detail (`/dojo/[level]/[lessonId]`)** — breadcrumb (Dojo ›
  Path › Lesson N), a richer lesson header with the path badge +
  textbook reference + "You'll learn" highlight pills, then three
  section cards (Vocab / Grammar / Listening). For lessons with live
  content the cards link into the per-section **lesson view**; cards
  show progress state (best score, attempts, "Start" / "Continue" /
  "Retake" / ✓ Passed). Footer has prev / next lesson navigation.
  Locked-path lessons render the same chrome but mark every section
  as `Locked`.
- **Section lesson view (`/dojo/[level]/[lessonId]/[section]`)** — the
  *teaching* surface for each section. Vocab presents a flashcard
  stack the user pages through; the front face shows the headword as
  HTML `<ruby>` when the entry ships a `furigana` segment array (so
  for `食べる` the reader can see `た` sits over `食` and `べる` is
  okurigana — fall-back for entries without `furigana` is the legacy
  stacked kanji/kana layout) plus a colored per-mora romaji row
  underneath that labels every kana with its Hepburn syllable
  (`わ wa · た ta · し shi`), so a learner can sound the word out
  without flipping. The flip side shows English, romaji, and
  `kanji · kana`. Grammar shows pattern explanations, prose, and
  example sentences (each with a play-audio button). Listening lays
  out every dialogue with a "Play audio" button and the JP / romaji /
  English transcript. The "Start drill" CTA at the bottom is **hard-
  gated** until the user has gone through the lesson: every flashcard
  visited for vocab, scroll-to-bottom for grammar, every dialogue
  played + scrolled to bottom for listening. Already-passed sections
  skip the gate so retakes don't force a re-read.
- **Section drills (`/dojo/[level]/[lessonId]/[section]/drill`)** — one
  client-driven drill per kind, reached only via the lesson view's
  "Start drill" CTA (direct URL still works). Vocab and Grammar use
  multiple-choice with instant feedback + per-question explanation;
  choices show **A. B. C. D.** labels. Listening renders a
  `ListeningCard` (Japanese line, native audio via
  `speech.ts`, optional romaji + English transcript) and asks a
  comprehension question per dialogue. **Which** questions appear is
  shuffled client-side per attempt; for **vocab** the option order is
  also shuffled when the bank is built. For **grammar** and
  **listening**, options are permuted in the runner (correct answer
  is not always "A" — see `shuffleDrillQuestionChoices` in
  `src/lib/dojo-content.ts`); the client sends `drillSeed` on submit so
  the server applies the same order when re-grading. Session length caps
  keep drills bite-sized. Server **re-grades** against the canonical
  bank in `dojo-content.ts` so the score is tamper-proof. Failed
  results surface a "Re-read lesson" button alongside "Retake".
- **Pass threshold** — `DOJO_PASS_THRESHOLD = 80%` on a single attempt.
  Below that the user can retake (the attempt still counts toward
  streaks / coins). At 80%+ the section flips to **passed** and stays
  passed forever; retakes still ratchet `bestScorePct` upward.
- **Lesson completion** — when the third-and-final section flips to
  passed in a single submission, the drill runner shows
  `LessonCompleteModal`: Dachi-sensei, the lesson title, coin total,
  any newly-unlocked achievements, and CTAs back to the lesson list or
  on to the next lesson.
- **Status states per lesson** — `available` (number badge, hover
  chevron), `locked` (lock icon, dashed border, dimmed),
  `completed` (check icon, emerald accent ring, surfaced from
  `DojoProgress`).
- **Sidebar** — the **Learn** group lists **Dojo** above **Self-study**.
  Dojo's children deep-link to the N5 / N4 paths via `?level=` query
  string; Self-study still exposes every drill (kana, vocab, grammar,
  kanji, muscle memory) as quick-jump children.

**Curriculum coverage (live now):**

| Lesson | Title | Vocab | Grammar | Listening |
|---:|---|---:|---:|---:|
| N5 · 1–12 | Genki I — full N5 grammar surface | 20–22 ea. | 4–5 ea. | 4 ea. |
| N4 · 13–23 | Genki II — full N4 grammar surface | ~20 ea. | 4 ea. | 4 ea. |

> N4 lessons are authored end-to-end but **drill access is gated
> behind full N5 completion**. Locked users can still open every N4
> lesson in preview mode to see what's coming.

The display layer (lesson titles, highlights, section counts) lives in
[`src/lib/dojo.ts`](src/lib/dojo.ts) with helpers `isLessonLive`,
`findLesson`, `getPathTotals`. The **content layer** (vocab items,
grammar explanations, listening prompts, drill banks) lives in
[`src/lib/dojo-content.ts`](src/lib/dojo-content.ts) — server-only,
typed via `LessonContent` / `VocabItem` / `FuriganaSegment` /
`GrammarPoint` / `ListeningPrompt` / `DrillQuestion`. `VocabItem`
carries an optional `furigana?: FuriganaSegment[]` array — opt-in
per word — that drives the ruby segmentation on the vocab card front
face. Words without it fall back to today's stacked kanji/kana layout
so backfill is incremental (N5 lesson 1 is the first one fully done;
remaining lessons have a `TODO(furigana)` comment). The kana → Hepburn
romaji helpers used for the per-mora colored row live in
[`src/lib/japanese-romaji.ts`](src/lib/japanese-romaji.ts)
(`splitMora`, `kanaToRomaji`, with full hiragana + katakana coverage,
yōon digraphs, sokuon doubling, and chōonpu handling). Server-side
reads/writes for progress live in
[`src/lib/dojo-server.ts`](src/lib/dojo-server.ts)
(`getDojoProgressByLesson`, `getDojoLessonProgress`,
`getCompletedLessonsCount`, `getDojoSectionsByKind`,
`submitDojoSection`).

**Persistence — `DojoProgress`:**

```
DojoProgress {
  id, userId, lessonId, section,        // section: "vocab"|"grammar"|"listening"
  bestScorePct Int @default(0),         // 0..100, ratchets upward
  attempts Int @default(0),
  passedAt DateTime?,                   // first time the section hit ≥80%; never cleared
  @@unique([userId, lessonId, section]),
  @@index([userId, lessonId]),
  @@index([userId, passedAt])
}
```

**Submission flow** (`POST /api/dojo/submit-section`):

1. Auth + validate `lessonId` / `section` against the catalog and
   `isSectionDrillable()` — coming-soon lessons are rejected.
2. Re-grade the client's answers against the canonical drill bank. For
   **grammar** and **listening**, the body includes `drillSeed` (the
   drill runner's retake counter) so the server can run the same
   `shuffleDrillQuestionChoices` permute as the client — authored MC
   rows keep the right answer in slot 0 in `dojo-content.ts`, but the
   UI shuffles the four options per attempt; grading indexes into that
   permuted order. **Vocab** is already shuffled in `getSectionDrills`
   and does not use this extra permute.
3. Insert a `QuizAttempt` row with `mode = "dojo_vocab" |
   "dojo_grammar" | "dojo_listening"` so Dojo activity automatically
   counts toward streaks, daily quests, and the standard quiz coin
   bonuses via `awardForQuiz`.
4. Upsert `DojoProgress` via `submitDojoSection()` and compute
   `newlyPassed` / `newlyCompletedLesson` flags.
5. Award Dojo-specific bonuses via `awardForDojoMilestones`:
   `dojoSectionPassBonus = +25` on first pass of a section,
   `dojoLessonCompleteBonus = +100` on first full-lesson clear.
6. Run `evaluateAchievements()` and return the list of newly unlocked
   milestones for the celebratory modal.

**Achievement integration** — adds the `dojo` achievement category and
the `dojo_lessons_completed` counter, with four tiers
(`dojo_first_lesson`, `dojo_3_lessons`, `dojo_6_lessons`,
`dojo_12_lessons`). The counter pulls from
`getCompletedLessonsCount(userId)` so it stays in lockstep with
`DojoProgress`.

**N5 mastery integration** — Dojo lesson sections power two N5 mastery
paths. The **Grammar** path's catalog is the 12 N5 lessons (a lesson
is "mastered" when its grammar drill is passed); the **Listening**
path mirrors the same catalog for its listening drill. Coming-soon
lessons stay in the catalog so the path total reflects the full Genki
I scope; attempted-but-not-passed sections show as **Started** in the
mastery modal. Both paths carry weight `0.5` in the grand percentage,
half that of kana / kanji / vocab, because their catalogs are smaller
(12 items) and a single section pass is already worth ~8% of the path.

### Self-study

Self-study lives at `/study` (the route stays the same — only the sidebar
label was renamed from "Study" to "Self-study" so the distinction with
the **Dojo** is unambiguous). It's the *free-roam* practice room: pick
any surface, no curriculum on top. It has:

- **Quick Actions strip** (see [Quick Actions](#quick-actions)).
- **Streak widget** with today's progress + the 30-day calendar.
- **Spaced review** card — only shown when you have items due via SRS, with
  a "Review N now" CTA that loads them straight into the quiz engine.
- **Five study cards**:
  - **Kana table** (`/study/kana`) — interactive hiragana + katakana gojūon
    grid. Tap a cell to play it; toggle romaji to self-test. Every tap also
    fires `/api/kana/view` so the N5 modal can mark that character as **Started**.
  - **Vocab cards** (`/study/vocab`) — flip romaji ↔ kana ↔ meaning, with native
    audio. Logs a `CardView` on flip / audio play / dwell ≥1.2s. A chip rail
    above the deck filters by source: **All** (authoritative count from
    `Word` — includes any orphan rows with `batchId = null` that predate the
    import-batch feature), one chip per N5 category pack the user has added
    (named like "Greetings (N5)"), and an **Imported Words** chip defined by
    *exclusion* — every word that isn't part of a named category pack,
    which covers both `source: "import"` batches and pre-feature orphans
    in a single bucket. So when the user has 99 total words and 63 sit in
    four category packs, Imported Words shows `(36)` regardless of whether
    those 36 are from `Import #N` sessions or `batchId = null` legacy rows.
    The chip renders whenever the rail is shown (even at zero) so the
    filter stays discoverable; clicking it when empty falls through to the
    deck's "no words" CTA which links to `/import`. Filters drive the URL
    (`?batch=<id>` or `?source=import`, mutually exclusive — `?batch` wins
    if both are sent); the deck remounts (and the deterministic daily
    shuffle re-seeds) on every chip change so each filter starts cleanly at
    card 1. The bottom action row reads **Prev / Focus / Next** — Focus
    opens an Anki-style fullscreen overlay (native `<dialog>` in the
    browser top layer with body scroll locked and a best-effort
    `requestFullscreen()` that no-ops on iOS Safari). The dialog is laid
    out in three zones: a header (counter + close `X`) with a
    `border-b` divider, a full-width body that *is* the swipe zone, and
    a footer (Prev / Flip / Next, three equal-width buttons in a
    `max-w-md` grid) with a `border-t` divider. The body's swipe
    handlers live on a wrapper div that extends *beyond* the card
    visual on every side, so users on iPad / wide phones can drag from
    any empty space around the card and still navigate — the bordered
    header and footer wall off the controls so they aren't accidentally
    swiped. The card visual itself uses `h-full` in focus mode (vs.
    `min-h-[320px]` inline) so it consumes the body area and the screen
    actually feels fullscreen on mobile. `touch-action: none` on the
    body kills the few-pixels-of-vertical-bleed you get on mobile when
    swiping horizontally. Esc or the top-right `X` exits; tapping the
    card or any swipe-zone empty space (or pressing Space) still flips
    the card. The inline Flip button is gone — Focus replaced it.
    Source: `src/components/study-card.tsx`.
  - **N5 grammar** (`/study/grammar`) — color-coded particles & sentence
    patterns; tap any word to hear it.
  - **N5 kanji** (`/study/kanji/[char]`) — animated stroke order, on'yomi /
    kun'yomi audio, themed sections. Logs a `KanjiView` on dwell / audio.
  - **Muscle memory** (`/study/muscle-memory`) — typing-trainer drill: type the
    romaji as kana scroll past. Setup defaults to all **basic (gojuon) rows**
    selected (instead of only five starter rows), with the **Basic** quick-filter
    tab shown as active by default, and session lengths
    `10 / 20 / 50 / 100 / 200`. A **Unique-only** toggle (default on) caps a
    session at the size of the selected pool; flip it off to enable a
    **Repetition** run that cycles the pool up to the chosen length with no
    back-to-back duplicates — useful for grinding 50+ reps over a tiny pool
    like `a / i / u / e / o`. Self-study is no longer paid per-action, so
    the drill posts to `/api/study/kana-drill` purely to feed daily quests
    and stats — the per-drill payout itself is now `+0`.

### Quiz engine

Quiz hub at `/quiz`, play screen at `/quiz/play`. Specialized launchers:
`/quiz/kana`, `/quiz/vocab`, `/quiz/kanji`.

The Hiragana / Katakana launcher (`/quiz/kana`) hosts a top-level
**Session mode** picker with two children:

- **Kana Guessing** (default) — the multiple-choice drill described
  below. Inherits the existing Ranked / Training scoring, Script
  picker (hiragana / katakana / both), Rows selector, and question
  count.
- **Reading Session** — a passive timed flashcard run organised into
  4 mora-graded stages. See **Reading mode (kana)** below.

**Question kinds** (`src/lib/quiz.ts`):

| Kind | Prompt | Answer |
|---|---|---|
| `kana_to_romaji` | hiragana/katakana | romaji |
| `romaji_to_english` | romaji | English |
| `romaji_to_kana` | romaji | hiragana/katakana |
| `hiragana_char` | hiragana | romaji |
| `katakana_char` | katakana | romaji |
| `kanji_to_meaning` | kanji | English meaning |
| `kanji_to_reading` | kanji | reading |
| `meaning_to_kanji` | English | kanji |

**Generation** (`/api/quiz/generate`) builds a multiple-choice set with
plausible distractors and a smart sampling weight — items the user has missed
recently (low SRS level / recent wrong answers) appear more often.

The **Vocab launcher** (`/quiz/vocab`) adds a Category card above the count
and session-mode cards. The picker is independent of Ranked/Training,
**multi-select**, and has two sections:

- **Your library** — `All`, every existing `ImportBatch` (category- or
  import-sourced), and a synthetic `Imported Words` chip that targets
  any word *not* in a `source: "category"` batch. Chips behave like
  checkboxes (`role="checkbox"`, `aria-checked`); the user can mix
  several batches and `Imported Words` together, and `All` is the
  implicit state when no other chip is selected (tapping `All` clears
  the rest).
- **From N5 catalog** — only rendered when there are catalog topics from
  `src/lib/categories.ts` the user hasn't added yet. Selected catalog
  chips fan out a parallel set of `POST /api/categories/add` calls on
  Start, then merge the returned batch ids into the generate request.
  The add API is idempotent (looks up the existing batch by name
  before creating one), so re-clicking is safe.

Picking any non-empty selection sends a `vocabFilter` to
`/api/quiz/generate` of shape
`{ batchIds?: number[]; includeImported?: boolean }`. The server
validates batch ownership (silently dropping unowned ids), unions the
two clauses into one Prisma `where`, and **caps the requested count**
to the size of the filtered pool — so a 12-word selection never has to
pad or repeat to fill a 50-question request. The capped value comes
back as `effectiveCount` in the response.

The "How many questions?" card has preset chips (`10`, `20`, `30`,
`50`, `100`) **plus a labelled custom number input** clamped to
`[1, 200]`. Both write the same single `count` state — picking a
preset updates the input, typing in the input deselects all presets.
The auto-cap helper still applies when the typed value exceeds the
selection's pool size.

Launchers cache the generated payload in `sessionStorage["quiz"]` as
`{ mode, questions, training, generate, consumed }`, where `generate`
stores the original request (`POST /api/quiz/generate` or
`GET /api/quiz/redo-missed?...`). On the first `/quiz/play` mount,
`consumed` flips to `true`. If the user refreshes mid-run, the play page
detects `consumed: true` and replays `generate` to replace the question
set before any answers are shown, so a refresh cannot restart question 1
with the same arrangement for perfect-score farming.

**Submission** (`/api/quiz/submit`):

- Inserts a `QuizAttempt` plus one `QuestionResult` per answered question
  (`prompt`, `correct`, `picked`, `isCorrect`, `timeMs`).
- Calls `recordReview()` for each result that maps to an SRS item.
- Awards coins (`COIN_RULES.quizBase + perCorrect + bonuses`).
- Calls `evaluateAchievements()` so the results screen can toast freshly
  unlocked milestones.
- Returns `{ attemptId, summary, coinsAwarded, newlyUnlocked, outcomes }`
  for the rich result screen (per-item mastery deltas).
- After a run finishes (ranked or training), the client clears
  `sessionStorage["quiz"]` so revisiting `/quiz/play` requires a fresh
  launcher flow.

#### Reading mode (kana)

A passive, dojo-flavored reading drill picked from the top-level
Session mode card on `/quiz/kana`. Designed for warm-up reps where the
learner sounds out a word, then has the romaji + English glossed for
them with native audio — no input required, no scoring pressure.

- **4 stages by syllable length** (mora, counted with `splitMora()`):
  Stage 1 = 2 mora, Stage 2 = 3 mora, Stage 3 = 4 mora, Final Stage
  = 5 mora. Stage metadata + the day-of-cycle math live in
  [`src/lib/reading.ts`](src/lib/reading.ts) (client-safe), the
  Prisma-backed deck loader lives in
  [`src/lib/reading-server.ts`](src/lib/reading-server.ts), and
  [`src/components/reading-stage-picker.tsx`](src/components/reading-stage-picker.tsx)
  draws the picker.
- **Daily set release.** Each stage has 5 sets of 50 words. On
  weekdays the active set auto-rotates by the user's local weekday
  (Mon = set 1, Tue = 2, … Fri = 5). On Sat / Sun the picker exposes
  a chip rail so the user picks any 1–5 to replay. Day-of-cycle is
  computed via `Intl.DateTimeFormat` in the user's IANA timezone
  resolved through `[src/lib/time.ts](src/lib/time.ts)` so the
  rollover lines up with streaks and daily quests.
- **Per-card loop** (`src/app/quiz/kana/reading/reading-runner.tsx`):
  - 4-second show window — kana only, large centered card.
  - At 1.0s and 2.0s, a soft sine `tickSoft()` blip; at 3.0s, a
    brighter `tickFinal()` triangle to telegraph reveal. Both live in
    `[src/lib/feedback.ts](src/lib/feedback.ts)` and are routed
    through the existing AudioContext + global enable gate.
  - 2.5-second reveal window — the same card grows a dashed-divider
    second row showing romaji + English; `speakJapanese()` plays once
    automatically and a `Volume2` button (or `R` keypress) replays it.
  - Auto-advance to the next card. After 50, a "Stage complete" card
    offers replay or pick-another-stage.
  - Space (or tapping the card) toggles pause; Esc exits to the
    setup page.
- **Refresh = re-shuffle.** No `sessionStorage` persistence. Today's
  50 words for the chosen (stage, set) are stable, but the server
  Fisher-Yates-shuffles on every fetch (in
  `getReadingWordsForStageAndSet`) so a refresh hands the runner a
  fresh order. The client deliberately does **not** re-shuffle —
  doing so would mismatch the SSR render and the first client paint
  of the kana card and trip a React hydration error.
- **Not persisted.** Reading mode intentionally does **not** write
  `QuizAttempt`, advance SRS, grant coins, or tick the streak. It
  sits parallel to Ranked / Training rather than under it.
- **Word bank lives in Postgres.** The `ReadingWord` table holds
  4 stages × 5 dayOfCycle slots × 50 words = 1000 rows. Seeded from
  [`prisma/seed/reading-words.ts`](prisma/seed/reading-words.ts) via
  `npx prisma db seed`; the seed runner asserts every row's mora
  count against `splitMora(display).length` before any DB write so
  bad content fails loudly. Future admin tooling
  ([roadmap 12](.cursor/docs/roadmap/12-words-transfer-to-database.md))
  will let ops edit / add / delete rows live without a redeploy.

**Routes**

- `/quiz/kana` — setup page (Server Component shell + client
  switcher).
- `/quiz/kana/reading?stage=N[&set=M]` — play screen. `set` is
  required on Sat / Sun and ignored on weekdays (the server
  derives it from the local weekday).

### Spaced Repetition (SRS)

Implemented in `src/lib/srs.ts`. Leitner-style with **6 levels**:

| Level | Interval until next due | Label |
|---:|---|---|
| 1 | 15 min | New / just missed |
| 2 | 20 h | Learning |
| 3 | 3 d | Reviewing |
| 4 | 7 d | Familiar |
| 5 | 16 d | Confident |
| **6** | 45 d | **Mastered** |

**Rules:**

- Levels only advance via correct **quiz** answers. Studying (viewing kana,
  flipping cards, watching stroke order) does **not** level anything up.
- A wrong quiz answer resets the item to **L1** so it re-enters the rotation
  fast.
- `getDueCount()` and `getMasteryBuckets()` power the Spaced Review card on
  the Study hub.
- "**Started**" is a separate, lighter state shown in the N5 mastery modal:
  the item has at least one study interaction (`KanaView`, `KanjiView`, or
  `CardView`) but no SRS row yet. Once the user is quizzed and gets `level >= 1`,
  the SRS level becomes the source of truth and Started is suppressed.
- **Orphan invariant.** `ReviewState.itemKey` is a stringified `Word.id`
  (or kana/kanji char) and is **not** FK-protected — Prisma can't cascade.
  Any code path that deletes a `Word` MUST also delete the matching
  `ReviewState` row in the same transaction (see
  `DELETE /api/words/[id]` for the reference pattern), otherwise the
  Spaced Review card over-counts and clicking through lands on
  "Nothing due right now". Both `getDueCount()` and `getDueItems()`
  defensively filter to live items, and `/api/study/review` runs a
  one-shot `sweepOrphans()` to hard-delete any leftovers it observes,
  but the transactional delete on the write path is the real fix.

### Streak & daily goal

Implemented in `src/lib/streak.ts`. A **day counts** when the user does **both**:

1. Answers ≥ `DAILY_QUIZ_GOAL` (50) quiz questions.
2. Views ≥ `DAILY_CARD_GOAL` (50) vocab cards in study.

Day boundaries are the user's **local midnight** (Intl timezone resolved on
first sign-in, persisted on `UserProfile.timezone`). Missed days break the
streak unless protected by a [Streak Freeze](#streak-freeze).

The **Streak widget** (sidebar + study page) shows current streak, a
30-day calendar (✅ goal hit, 🛡 frozen, ❌ missed), and progress toward today's
two requirements.

### Streak Freeze

Auto-protection so a single missed day doesn't blank out a long run.

- **Earn**: 1 freeze granted at the start of every ISO week (Mon 00:00 local).
- **Cap**: at most `MAX_STORED_FREEZES` (2) unclaimed freezes per user — keeps
  it a safety net rather than an exploit.
- **Spend**: by default, `reconcileStreakFreezes()` runs on every page load and
  auto-burns one freeze on yesterday's miss if the day failed.
- **Manual mode**: toggle "Auto-freeze streak" off in Settings to spend freezes
  yourself from the streak calendar.

### Coins

Append-only ledger (`CoinLedger`) — every grant/spend writes one row. Balance
is `SUM(amount)`. Today's earnings are `SUM(amount) WHERE createdAt >= local-midnight`.

Reward table (`COIN_RULES` in `src/lib/coins.ts`):

| Action | Reward |
|---|---|
| Take a quiz (≥1 question) | +5 base |
| Per correct quiz answer | +1 |
| ≥90% accuracy on a ≥5-question quiz | +10 |
| 100% accuracy on a ≥5-question quiz | +20 (stacks with above) |
| Vocab card studied | +0 (self-study is no longer paid per-action; daily quests still pay) |
| Kanji studied | +0 (self-study is no longer paid per-action; daily quests still pay) |
| Kana drill base | +0 (self-study is no longer paid per-action) |
| Perfect kana drill (≥10 questions) | +0 (self-study is no longer paid per-action) |
| First pass on a Dojo section (≥80%) | +25 |
| Complete a full Dojo lesson (all 3 sections passed) | +100 |
| Daily quests | see below |

**Idempotency**: every grant has a `dedupKey` enforced via a unique constraint
(e.g. `quiz:<attemptId>`, `quest:<localDay>:<questId>`). Retries are safe.

### Daily quests

A handful of higher-value goals that reset at local midnight. Defined in
`DAILY_QUEST_DEFS`:

| Quest | Target | Reward |
|---|---|---|
| Take a quiz | 1 quiz | +25 |
| Answer 50 quiz questions | 50 | +50 |
| Study 50 vocab cards | 50 | +50 |
| Ace a quiz (≥90%) | 1 | +50 |
| (extras may be added in `coins.ts`) | | |

`getDailyQuests()` computes progress; the dashboard surfaces them in the
**Daily quests** card. Rewards are auto-claimed when crossed
(`syncTodaysCoins()`), with the dedup key `quest:<YYYY-MM-DD>:<questId>`.

### Achievements

One-time milestone catalog in `src/lib/achievements.ts`. Each achievement has
a stable `id` (rename = re-lock — don't), an icon, a `kind`, and a numeric
`goal`. The `Achievement` table records which the user has claimed
(`@@unique(userId, achievementId)` makes evaluation idempotent).

**Categories**: streak · quiz · study · mastery · rewards · dojo · milestone.

**Kinds** map to counters computed in `computeCounters()`:

- `streak_current` / `streak_longest`
- `total_quizzes` / `total_questions` / `perfect_quizzes`
- `coins_earned`
- `cards_viewed` (counted as **distinct words** studied, not raw view counts)
- `kanji_chars_seen` (distinct chars across all kanji-related quiz prompts)
- `srs_mastered` (sum of all `level >= MAX_SRS_LEVEL` items)
- `dojo_lessons_completed` (lessons whose vocab + grammar + listening sections have all been passed)
- `kana_mastered` / `kanji_mastered` / `vocab_mastered`
- `n5_grand` (the headline; see below)

**Evaluation**:

- `evaluateAchievements()` is canonically fired by:
  - `POST /api/quiz/submit` — so the results screen can toast unlocks.
  - `getAchievementsProgress()` (the Achievements page itself) — self-heals
    study-only unlocks that didn't pass through a quiz.
- It used to also fire fire-and-forget on every page load; that ran ~10 DB
  queries per navigation for unlocks no other surface displayed, so it was
  removed.

The Achievements page (`/achievements`) shows:

- **Closest to unlocking** — ranked list of in-progress achievements ordered
  by `pct` desc, so you can see what's one step away.
- **Achievements tabs** — All / by category, each card showing icon,
  description, locked/unlocked state, and progress bar.
- **N5 Grand card** — clickable, opens the **N5 Mastery modal**.

### N5 Mastery paths

`src/lib/n5-paths.ts` is the **single source of truth** for "how close am I
to N5?". It models N5 as a set of **paths** (axes), each with:

- a static catalog (kana / kanji / vocab / grammar)
- a `weight` in the grand %
- a `completion` fraction (e.g. vocab counts as "done" at 75% mastered, since
  the catalog is huge)
- a `status` of `live` or `coming-soon`

| Path | Weight | Completion | Status |
|---|---:|---:|---|
| Kana | 1 | 90% | live |
| Kanji | 1 | 100% | live |
| Vocab | 1 | 75% | live |
| Grammar | 1 | 100% | coming-soon |
| Listening | 0.5 | 100% | coming-soon |
| Writing | 0.5 | 100% | coming-soon |
| Speaking | 0.5 | 100% | coming-soon |

Coming-soon paths contribute **0 weight** to `grandPct` so the bar stays
meaningful until they ship.

The **N5 Mastery modal** (clickable from the achievements page) shows tabs
per path. Each tab has:

- A header with mastered / total / goal and an animated progress bar (1-decimal
  precision).
- A **Stat strip**: Mastered, Reviewing (`level 3..5`), Started, Total.
- A **Mastery levels** legend that doubles as filter chips: All · Not started ·
  **Started** · L1 · L2 · L3 · L4 · L5 · **L6 (Mastered)** — each chip shows
  count and color.
- An explanatory line: *"View or listen to tag an item as Started. Items
  only level up L1 → L6 when you answer them correctly in a quiz."*
- A **paginated item list** (30 per page) with character square (color-coded
  by bucket), label, sub-label, and a level/status tag.

**Adding a new path**: add an `N5PathDef` entry, point `loadCatalog()` at its
data, optionally feed studied/level data into `getN5PathsProgress()`'s batched
fetch, and the achievements card + modal pick it up automatically.

### Quick Actions

A 4-tile strip at the top of `/study` (just below the Streak widget) for
re-entering your flow in one tap:

| Tile | Target | Live data |
|---|---|---|
| Take a quiz | `/quiz` | Today's quiz answers / 50 (or due count if any) |
| Daily cards | `/study/vocab` | Today's vocab views / 50 |
| N5 progress | `/achievements` | — |
| Recent attempts | `/progress` | — |

The "Take a quiz" tile swaps to a `BrainCircuit` icon when there are SRS items
due, hinting at the dedicated **Spaced review** section right below.

### Progress page

`/progress` is the analytics surface:

- **Stats strip** — total attempts, lifetime questions, recent accuracy,
  weakest/slowest counts.
- **Accuracy over time** chart and **accuracy by mode** bars.
- **Recent attempts table** (paginated). Click a row → drill into
  `/progress/attempts/[id]` for the per-question breakdown (prompt, picked,
  correct answer, time taken, ✓/✗).
- **Weakest words** and **Slowest words** tables.
- **AI study tips** are not shown in the UI for now. The `POST /api/progress/tips` route and Gemini helper remain; when the feature returns it will be exposed in **one in-app place only** (see `.cursor/docs/roadmap/09-tiers-and-trial.md`).

The page is a Server Component (`src/app/progress/page.tsx`) that calls
`getProgressStatsForUser(userId)` from `src/lib/progress-stats.ts` directly
— no client-side fetch, no skeleton flash, no extra `read`-bucket charge
on top of the route render. The interactive bits (recent-attempts
pagination, recharts) live in the client island
`src/app/progress/progress-view.tsx`. The `GET /api/progress/stats` route
is preserved for future client-side refresh, embedding, or third-party
tooling and now also delegates to `getProgressStatsForUser`.

### Settings & timezone

`/settings`:

- **Timezone** — auto-detected from the browser
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and persisted on
  `UserProfile.timezone`. Streaks, daily quests, and "today's earnings" all
  bucket by **local** day.
- **Auto-freeze streak** — toggle the Streak Freeze auto-spend behavior.

### Shop & Inventory

The cosmetics economy. Coins are earned through quizzes, Dojo milestones,
daily quests, and streak rewards (self-study activities like vocab cards,
kanji study, and kana drills no longer pay per-action — they only count
toward quests/stats), and **spent** in the Store on cosmetics that decorate
the dashboard mascot, the home scene, and shareable progress screens. The
intended loop is *study → earn → flex*: progression is visible, worth
showing off, and rewarding to chase.

#### Phase 1 — what ships now

- **`/shop`** — Server-rendered balance header (`getCoinSummary`) + a client
  `ShopBrowser` with a category tab strip and a responsive item grid. Every
  card shows the rarity ribbon, glyph placeholder, name (with optional
  Japanese name), description, price chip, and a disabled **Coming soon**
  CTA. The coin chip in the topbar (and the sidebar coin panels) deep-link
  here.
- **`/inventory`** — "Your closet" page with a **12-slot** equipped-preview
  grid laid out as a paper-doll: 2×3 left rail (Head / Face / Neck / Top /
  Bottom / Feet — the outfit, top-down), the mascot preview, then 2×3 right
  rail (Hand / Back / Pet / Background / House / Accessory — held items,
  then world & scene). Every tile is **Empty** in Phase 1 and per-category
  empty states point back to the Store. The slot grid is the visual teaser
  for the Phase 2 dashboard mascot canvas.
- **Sidebar** — a new **Shop** group sits between Learn and Account with
  Store + Inventory siblings.
- **No Prisma changes.** Every catalog item is `status: "coming-soon"` so
  there's nothing to persist yet.

Catalog lives in [`src/lib/shop.ts`](src/lib/shop.ts) — typed `const` arrays,
no DB dependency. Helpers: `getShopCategory(id)`, `getItemsByCategory(id)`.

#### Categories (12)

Listed in **rail order** — first 6 form the Inventory page's left rail
(top-down outfit), last 6 form the right rail (held → world → scene).

| Category | Slot | Tone | Example items |
|---|---|---|---|
| Headwear | head | amber | Fox mask, Samurai kabuto, Oni mask |
| Face | face | emerald | Round glasses, Surgical mask, Kabuki paint, Oni paint |
| Neck | neck | slate | Wool scarf, Omamori charm, Bell collar, Dragon pendant |
| Tops | top | rose | Yukata top, Kimono jacket, Ninja gi |
| Bottoms | bottom | violet | Hakama, Samurai greaves |
| Shoes | feet | sky | Geta sandals, Tabi boots, Dragon boots |
| Hand | hand | rose | Open textbook, Ornate fan, Bokken, Dragon scroll |
| Back | back | sky | Studio backpack, Paper wings, Dragon cape, Spirit wings |
| Pets | pet | emerald | Maneki-neko, Tanuki, Baby dragon |
| Backgrounds | background | violet | Sakura grove, Torii gate, Mt. Fuji |
| House | house | amber | Tatami room, Zen garden, Shrine altar |
| Accessories | accessory | slate | Scholar badge, Enamel pin, Lucky charm |

#### Rarity → price ladder

| Rarity | Coin price | Visual cue |
|---|---|---|
| Common | 50 | Muted chip + soft border |
| Rare | 250 | Sky chip + cyan ring on hover |
| Epic | 1,000 | Violet chip + violet glow |
| Legendary | 3,000 | Amber chip + warm glow |

Per-rarity styling tokens live in `RARITY_META`; per-tone background gradients
live in `TONE_META` — both exported from `src/lib/shop.ts` so any future
surface (item detail dialog, dashboard mascot card) reuses the same language.

#### Phase 2 — when real cosmetics ship (planned)

When art is ready, flipping items from `"coming-soon"` to `"live"` is *not*
enough on its own. The cutover plan:

- **Prisma additions:**
  - `UserInventory { userId, itemId, acquiredAt, @@unique([userId, itemId]) }`
  - `EquippedCosmetic { userId, slot, itemId, @@unique([userId, slot]) }`
- **`spendCoins(userId, { amount, dedupKey: "shop:<purchaseId>", reason })`**
  in [`src/lib/coins.ts`](src/lib/coins.ts) — writes a negative-amount row
  to `CoinLedger` guarded by a balance check. The ledger already tolerates
  negatives; `awardCoins` early-returns on `amount <= 0` so the spend path
  is cleanly separate.
- **`POST /api/shop/buy`** — verify balance → insert `UserInventory` →
  `spendCoins` → return updated balance + the unlocked item.
- **Dashboard integration** — replace the `<Image src="/Dachi-mascot.png" />`
  block in [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) with
  a `<MascotCanvas equipped={…} />` client component that layers each
  cosmetic in slot z-order: `back-accessory → body → bottom → top → neck →
  face → headwear → hand → front-accessory`, with `background` and `house`
  rendered behind the mascot and `pet` floating beside it.
- **Inventory** — swap empty-state tiles for owned-item cards with an
  "Equip" toggle that hits `POST /api/shop/equip`.

### In-app notifications

The bell icon in the topbar (next to the coin chip) is the user's
persistent feed for things that happened in their account: a quiz
they just finished, an achievement they just unlocked, a Dojo lesson
they just completed, and a daily quest reward that was just claimed.
Click a row to mark it read and jump to the relevant page; the full
history lives at `/notifications`.

Every notification is **also** rendered as a transient toast the
moment it fires — the bell is the persistent log, the toast is the
real-time alert. A "Vocab milestone" landing in the bell while the
user is on the vocab cards page also pops a card under the topbar
that they can click (mark-read + navigate) or dismiss. The toast
stack lives at the top-right (anchored under the bell so the visual
association is "this slid out of the bell"); the welcome toast lives
at the bottom-right so the two never collide.

The "Welcome back, &lt;name&gt;" greeting is **not** logged in the
bell — it renders only as a transient floating toast
(bottom-right, auto-dismiss after ~6s) the first time the signed-in
shell mounts in a browser session
(`src/components/welcome-toast.tsx`). A fresh sign-in always creates
a fresh `sessionStorage` scope, so the toast fires on every login but
stays quiet on internal navigation and page reloads.

**Triggers (initial scope)**

| Event | Where it fires | Notification kind |
|---|---|---|
| Quiz submitted (vocab / kana / kanji / dojo section) | `POST /api/quiz/submit`, `POST /api/dojo/submit-section` | `session.quiz` |
| Kana muscle-memory drill completed | `POST /api/study/kana-drill` | `session.kana_drill` |
| Crossed 25 / 50 / 100 vocab cards studied today | `POST /api/cards/view` | `session.cards_milestone` |
| Crossed 25 / 50 / 100 kanji studied today | `POST /api/kanji/view` | `session.kanji_milestone` |
| Last section of a Dojo lesson passed | `POST /api/dojo/submit-section` | `lesson.dojo_completed` |
| Achievement unlocked | Anywhere `evaluateAchievements()` returns rows | `achievement.unlocked` |
| Daily quest reward claimed | After `claimEligibleQuests()` returns rows | `quest.completed` |

**Mechanics**

- All writes go through the typed wrappers in
  [`src/lib/notify.ts`](src/lib/notify.ts) — never insert into
  `Notification` directly. Each kind has a fixed `dedupKey` shape (e.g.
  `quiz:<attemptId>`, `achievement:<userId>:<id>`,
  `quest:<localDay>:<questId>`) so re-firing on a network retry, a
  client-side double-tap, or a layout re-render is a no-op at the
  database. `src/lib/coins.ts` returns the list of *just-claimed*
  quests on its `CoinAwardSummary.claimedQuests` field so trigger
  routes can fan out without a re-query.
- Card / kanji daily milestones piggyback on the per-day awarded-views
  count that `awardForCardView` / `awardForKanjiView` already compute
  (no extra query). The tier crossing is detected by
  `maybeNotifyCardsMilestone` / `maybeNotifyKanjiMilestone` in
  `src/lib/notify.ts`.
- **Alert + log in one round trip.** Each `notify*` writer returns
  the freshly created `NotificationRow` (or `null` on dedup). Trigger
  routes collect those rows and attach them to their JSON response
  as `newNotifications: NotificationRow[]`. The client `apiFetch`
  wrapper inspects every 2xx body for that field and dispatches the
  rows through the in-process pub/sub at
  [`src/lib/notification-bus.ts`](src/lib/notification-bus.ts). That
  bus drives two consumers:
  - `<NotificationToastStack/>` ([`src/components/notification-toast-stack.tsx`](src/components/notification-toast-stack.tsx))
    pops each row as a transient card under the topbar (top-right on
    desktop, top of safe-area on mobile). Visible cap is 8 so a quiz
    finishing with several achievements + a quest claim still fits
    without dropping the headline event. `dispatchNewNotifications`
    iterates rows in **reverse server order**, so the trigger
    route's headline row (`quiz_finished`, `drill_finished`, etc.)
    ends up at the top of the visible stack and is the last thing
    dropped if the cap is exceeded. Hover/focus pauses the 6s
    auto-dismiss; click marks the row read + navigates; X dismisses.
  - The bell subscribes to a sibling `refresh` channel, so its unread
    badge and dropdown rehydrate in the same tick the toast pops.
- The bell (`src/components/notification-bell.tsx`) is a client
  component injected into the topbar. It is **fully event-driven**
  — there is no `setInterval` poll, no `window.focus` refetch, and
  no `visibilitychange` refetch. `GET /api/notifications?limit=10`
  fires only when there's a real reason to:
  1. **Once on mount** — initial unread count for the badge.
  2. **On bus `refresh`** — any first-party API response carrying a
     `newNotifications` field auto-dispatches through
     `notification-bus`, so completing a quiz / drill / lesson
     refreshes the bell in the same tick the toast pops.
  3. **Cross-tab** — `notification-bus` mirrors the refresh signal
     onto a `BroadcastChannel('tomodachi-notifications')`. If you
     finish a quiz in tab A, tab B's bell hears the cross-tab
     message and refreshes too — no polling required.
  4. **On dropdown open** — debounced by a 30s freshness window, so
     rapid toggles don't generate redundant requests but the user
     still sees fresh data when they actually look.
  Clicking a row optimistically decrements the unread badge, fires
  `POST /api/notifications/[id]/read`, then navigates. "Mark all"
  hits `POST /api/notifications/read-all` once.
- Visual formatting (title, body, glyph, tone, target href) lives in
  [`src/lib/notify-format.ts`](src/lib/notify-format.ts) so the
  dropdown, `/notifications` history page, AND the toast stack stay
  in lockstep. Quiz notifications include the quiz type in the body
  copy (e.g. `Vocab quiz`, `Kanji quiz`, `Dojo grammar`) alongside the
  score so users can tell what session just completed.
- All notification writes are wrapped in `try/catch` at the call site
  — a notification outage must never break the user-facing action
  (quiz submit, dojo lesson complete, etc.). On the client side, a
  malformed or missing `newNotifications` field is silently ignored
  by the `apiFetch` extractor.

**Routes**

- `/` topbar bell — present on every signed-in page.
- `/notifications` — Server Component shell + `NotificationsClient`
  island. Renders as a real `<table>` on desktop (Type / Details /
  When columns) and stacked cards on phones. Paginated **10 rows per
  page** via `?page=N`, server-driven (each page is a fresh RSC
  render — no client-side data fetching), with `Prev` / `Next` links
  and a "Showing 11–20 of 247" indicator. Backed by
  `getNotificationsPage()` in `src/lib/notify.ts`, which uses
  Postgres `OFFSET / LIMIT` over the `(userId, createdAt)` index and
  clamps out-of-range pages so a stale `?page=99` URL still renders
  the last available page instead of a blank screen. Mark-read /
  mark-all controls update local state optimistically and call
  `router.refresh()` so the next navigation reflects server state.
- The welcome toast has no route of its own; it is mounted at the root
  of the signed-in `AppShell` so it pops in regardless of the landing
  page after sign-in.

**Cross-links** — quest claims fired here are the same rows recorded
by [Coins](#coins) → [Daily quests](#daily-quests); achievement
unlocks here mirror the celebrations on the
[Achievements](#achievements) page; dojo lesson completions echo the
modal from [Dojo](#dojo-guided-curriculum). Roadmap for the next slice
(streak warnings, friend events, admin announcements, per-kind
opt-outs) lives in
[`.cursor/docs/roadmap/04-in-app-notifications.md`](.cursor/docs/roadmap/04-in-app-notifications.md).

---

## Data model

All tables are keyed by `userId` (Clerk id) for tenancy isolation.

| Table | Purpose |
|---|---|
| `Word` | The user's vocabulary library. Unique on `(userId, romaji)`. |
| `ImportBatch` | Groups words into named buckets (e.g. "Greetings (N5)"). |
| `QuizAttempt` | One row per finished quiz (`mode`, `total`, `correct`). |
| `QuestionResult` | Per-question detail (`prompt`, `picked`, `correct`, `isCorrect`, `timeMs`). |
| `CardView` | A single vocab study interaction (flip / audio / dwell). |
| `KanjiView` | A single kanji study interaction (audio / dwell). |
| `KanaView` | A single kana table tap. |
| `ReviewState` | SRS scheduling row per `(user, itemType, itemKey)`. |
| `UserProfile` | Per-user settings (timezone, autoFreezeStreak). |
| `StreakFreeze` | Earned/consumed protection rows. Weekly grant key. |
| `Achievement` | Claimed milestones, dedup'd by `(userId, achievementId)`. |
| `CoinLedger` | Append-only coin history. Balance = sum(amount). Dedup'd by `dedupKey`. |
| `DojoProgress` | Per-section Dojo progress (`bestScorePct`, `attempts`, `passedAt`). Unique on `(userId, lessonId, section)`. |
| `Notification` | In-app bell entries. `kind` + `payload` (JSONB) + `dedupKey` (idempotency). Indexed on `(userId, createdAt)` and `(userId, readAt)`. |
| `ReadingWord` | **Global** (not per-user) catalog for the kana quiz Reading mode. 4 stages × 5 daily-cycle slots × 50 words = 1000 rows, seeded by `npx prisma db seed`. Unique on `(stage, dayOfCycle, sortIndex)` so re-seeds + future admin edits never collide. Indexed on `(stage, dayOfCycle)` for the per-set fetch. |

Migrations live in `prisma/migrations/`. Use `npx prisma migrate dev --name <slug>`
when you change the schema and `npx prisma migrate deploy` in CI/prod.

---

## API surface

All endpoints require Clerk auth via `requireUserId()` and return JSON.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/words/import` | POST | Bulk-import romaji → enriched Word rows. |
| `/api/words/[id]` | PATCH/DELETE | Edit or remove a single word. |
| `/api/categories/add` | POST | Add a JLPT N5 category to the user's library. |
| `/api/batches` | GET | List the user's import batches. |
| `/api/cards/view` | POST | Log a vocab `CardView`. |
| `/api/kana/view` | POST | Log a kana table tap (`KanaView`). |
| `/api/kanji/view` | POST | Log a kanji study interaction (`KanjiView`). |
| `/api/quiz/generate` | POST | Build a quiz set with smart sampling. Optional `vocabFilter: { batchIds?: number[]; includeImported?: boolean }` narrows the vocab pool to one or more category batches and/or to non-catalog (imported) words; unowned `batchIds` are silently dropped. The server caps `count` to the filtered pool size and returns `effectiveCount`. |
| `/api/quiz/submit` | POST | Persist results, advance SRS, award coins, evaluate achievements. |
| `/api/quiz/redo-missed` | POST | Build a quiz from the user's recent misses. |
| `/api/dojo/submit-section` | POST | Re-grade a Dojo section drill, upsert `DojoProgress`, log a `QuizAttempt`, award coins, evaluate achievements. |
| `/api/study/review` | GET | Fetch the user's SRS-due items as a quiz set. |
| `/api/study/kana-drill` | POST | Award coins for the muscle-memory drill. |
| `/api/streak/freeze` | GET | Current freeze inventory. |
| `/api/streak/freeze/use` | POST | Spend a freeze on a specific past day. |
| `/api/coins` | GET | Balance + today's earnings. |
| `/api/profile/timezone` | POST | Persist the browser's IANA timezone. |
| `/api/profile/preferences` | POST | Toggle `autoFreezeStreak` etc. |
| `/api/progress/stats` | GET | Backing data for charts on `/progress`. |
| `/api/progress/tips` | POST | Gemini tips from `getProgressSummary` (no app UI; reserved for a single future surface per roadmap 09). |
| `/api/notifications` | GET | Latest in-app notifications + unread count (defaults to 10, max 50). Called by the topbar bell on mount, on bus refresh (in-tab + cross-tab), and on dropdown open after a 30s freshness window — no polling timer. |
| `/api/notifications/[id]/read` | POST | Mark a single notification read; returns the updated unread count. |
| `/api/notifications/read-all` | POST | Mark every unread notification read in one updateMany. |
| `/api/reading/words` | GET | Today's deck for the kana Reading mode. Required `stage` (1..4); optional `set` (1..5) used only on Sat / Sun (weekday calls derive the set from the user's local weekday and ignore `set`). Returns `{ stage, set, isAutoSet, weekdayLabel, words[] }` with `words` server-shuffled. |

> **Every endpoint above is rate-limited per-user** via
> [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts). When a user exceeds
> the bucket, the route returns `429 Too Many Requests` with
> `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
> `X-RateLimit-Reset` headers. See the next section for bucket sizes.

---

## Rate limiting & abuse protection

Backed by **Upstash Redis** + `@upstash/ratelimit` (sliding-window
counters). One helper is the only thing routes call:
[`enforceRateLimit(category, identifier)`](src/lib/rate-limit.ts).
Returns `null` when allowed, a `429 NextResponse` when over budget —
drop-in after `requireUserId()`:

```ts
const userId = await requireUserId();
if (userId instanceof NextResponse) return userId;

const limited = await enforceRateLimit("write", userId);
if (limited) return limited;
```

**Buckets** (per user, sliding window):

| Category | Limit | Window | Used by |
|---|---:|---|---|
| `ai` | 5 | 1 min | `/api/progress/tips`, `/api/words/import` (LLM-backed) |
| `write` | 30 | 1 min | quiz/dojo submit, word edits, drill results, profile updates |
| `view` | 120 | 1 min | `/api/cards/view`, `/api/kana/view`, `/api/kanji/view` (high-volume study writes) |
| `read` | 120 | 1 min | dashboard / progress / stats / list endpoints (incl. `/api/notifications` — called event-driven by the bell, not on a timer) |
| `sensitive` | 10 | 10 min | `/api/streak/freeze/use` (inventory spend) |

Tweak the table in `src/lib/rate-limit.ts` if real traffic shows
different shapes. The categories are intentionally coarse — five
buckets is enough to cover every route without a per-route registry to
maintain.

**Graceful degradation.** When `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` are unset, the helper returns
`{ success: true, configured: false }` and every request passes through.
This keeps local dev frictionless. In production the missing-config
path logs a single warning per cold start so it's visible if you forget.

**Fail-open on Redis errors.** If Upstash itself is unreachable
(network blip, regional outage), the helper logs the error and lets
the request through rather than 503-ing the whole app. The Gemini bill
is the worst case here, and Gemini has its own SDK-level retries.

**What this does *not* protect against:**

- **Network-layer DDoS** — handled by Vercel's edge (free tier
  includes baseline DDoS protection; Vercel Pro adds Web Application
  Firewall rules).
- **Sign-up bot flooding** — handled by Clerk's built-in bot
  detection. Enable "Bot signup protection" in the Clerk dashboard.
- **Multi-account abuse** (one user, many Clerk accounts to dodge
  per-user limits) — needs IP-level rate limiting on `/sign-up` and
  email-domain heuristics. Tracked separately, not blocking launch.

---

## Performance notes

A few patterns the codebase leans on, kept here so refactors don't undo them:

- **Batched parallel fetches.** Server components do one `Promise.all([...])`
  per request and pass scalars down. See `dashboard/page.tsx`,
  `study/page.tsx`, `getAchievementsProgress`, and `getN5PathsProgress`.
- **One SELECT per snapshot.** `getN5PathsProgress` issues a single set of
  parallel queries (one `ReviewState` for all item types, one each for
  `KanaView` / `KanjiView` / `CardView`, one `Word.findMany` reused by both
  vocab levels and vocab studied) instead of looping per path.
- **Static catalogs are computed once at module load.** `KANA_CATALOG`,
  `KANJI_CATALOG`, `VOCAB_CATALOG`, `GRAMMAR_CATALOG`, `LISTENING_CATALOG`
  in `n5-paths.ts` build on first import and are reused forever.
- **No fire-and-forget achievement eval in layout.** Layout used to evaluate
  achievements on every page navigation; we removed it because the cost
  (~10 queries per nav) only paid off for unlocks that weren't surfaced
  outside the achievements page or the quiz results screen — both of which
  call `evaluateAchievements()` themselves.
- **`SELECT` projections everywhere.** Prisma queries pass `select: {...}`
  with only the fields actually used; the `QuizAttempt.questions` JSON blob
  in particular is heavy and never pulled when only `total/correct` are
  needed.
- **Distinct counts via Postgres.** `cardView.findMany({ distinct: ["wordId"] })`
  beats pulling all rows and de-duping in JS.
- **Coin idempotency via `dedupKey`** + DB unique constraint, so retries are
  free and quest claims can never double-pay.
- **Daily rollover on local midnight.** Anything date-bucketed (streak, quests,
  today's earnings) uses `localDayKey()` from `src/lib/time.ts`, never `new Date().toDateString()` (which is a UTC concept).
- **Notification fan-out is non-blocking.** Every `notify*` call from a
  trigger route is wrapped in `try/catch` so a `Notification` insert
  failure (or a Postgres blip) never breaks the user-facing action
  (`/api/quiz/submit` etc.). Card / kanji daily milestones reuse the
  awarded-views count that the coin helper already computed for the
  cap check, so adding the bell does not add a per-request COUNT
  query on the hot view-logging endpoints.
- **Toast + log share one round trip.** Trigger routes echo the rows
  they just inserted as `newNotifications` in their JSON response.
  The `apiFetch` wrapper auto-dispatches them through
  `notification-bus.ts` — no per-call-site plumbing, no second
  `GET /api/notifications` poll required to surface the toast. The
  bus also pings the bell to refresh its unread badge in the same
  tick, so the alert and the log entry appear in lockstep. **Every
  client-side call to a notification-emitting route MUST go through
  `apiFetch`**, never raw `fetch()` — `apiFetch` is the only path
  that runs the bus auto-dispatch. Self-study endpoints (`cards/view`,
  `kanji/view`, `study/kana-drill`) were specifically migrated to
  `apiFetch` so their daily-milestone and quest-claim notifications
  actually pop a toast instead of silently writing to the bell only.
- **Bell is fully event-driven, no polling.** The topbar
  `NotificationBell` only calls `GET /api/notifications` when there's
  a real reason to: once on mount, on every bus `refresh` (in-tab
  via `apiFetch` auto-dispatch, cross-tab via
  `BroadcastChannel('tomodachi-notifications')`), and when the user
  opens the dropdown after a 30s freshness window. There is no
  `setInterval`, no `window.focus` refetch, and no
  `visibilitychange` refetch — backgrounded tabs and rapid focus
  toggles never burn the `read` rate-limit bucket.

---

## Conventions

- **Don't break achievement ids.** Renaming an `id` re-locks the achievement
  for everyone. Append new entries; never edit existing ids.
- **Server components do the data fetching.** Client components are reserved
  for interactivity (quiz play, kana table audio, modal state). When a page
  needs both, prefer a Server Component shell that passes data into a small
  client island as props — see `src/app/progress/page.tsx` →
  `progress-view.tsx`, `src/app/quiz/vocab/page.tsx` →
  `vocab-quiz-form.tsx`, `src/app/import/page.tsx` →
  `import-client.tsx`, and `src/app/notifications/page.tsx` →
  `notifications-client.tsx` for the canonical shape. Mutations from
  the client island re-trigger the shell with `router.refresh()` (see
  the `/import` page) instead of re-fetching into local state. Avoid
  `useEffect → fetch` on first render; that's the anti-pattern this
  convention exists to prevent.
- **Client `fetch` to first-party `/api/*` goes through `apiFetch` from
  `src/lib/api-client.ts`.** It throws `ApiRateLimitError` on 429 (with
  `retryAfter` extracted) and `ApiError` on other non-2xx with the parsed
  body, so call sites don't keep re-implementing JSON parsing and 429
  handling. Pass an `AbortSignal` for cancellable mounts. Use
  `apiErrorMessage(e, fallback)` from the same module to format the
  caught error for the UI — it produces a friendly "You're going too
  fast. Try again in Xs." string for rate-limit errors and falls through
  to the server's `error` field otherwise. The only first-party `fetch`
  calls allowed to stay on the native API are *intentional fire-and-forget
  telemetry* (currently `/api/cards/view`, `/api/kanji/view`,
  `/api/kana/view`, and the kana-drill coin minter); each of those sites
  carries an inline comment justifying the exception so reviewers don't
  re-litigate it.
- **Client-only side effects belong in dedicated hooks, not inlined into
  shells.** The browser-timezone self-healing sync lives in
  `useTimezoneSync` (`src/lib/use-timezone-sync.ts`), called from
  `AppShell`. New cross-page client effects should follow the same
  pattern so the shell stays focused on layout.
- **Comments explain *why*, not *what*.** Especially in `srs.ts`, `coins.ts`,
  `n5-paths.ts`, and `achievements.ts` — the math has reasons.
- **Time math always uses `src/lib/time.ts` helpers.** Local midnight, local
  day key, IANA timezone validation — every feature with daily rollover sits
  on this file.
- **API handlers funnel through `requireUserId()`.** No raw `auth()` outside
  the helper.
- **Every API route calls `enforceRateLimit(category, userId)`** right
  after auth. Pick a bucket from the table in
  [Rate limiting](#rate-limiting--abuse-protection) — the helper owns
  the response shape, headers, and degraded-mode behavior. Skipping
  this on a new endpoint is a review blocker.
- **Client components must not call `n.toLocaleString()` without a
  fixed locale** — Node (SSR) and the browser can disagree and trigger
  React hydration errors. Use `formatInt(n)` from `src/lib/utils.ts` for
  integers, or pass `"en-US"` (or another explicit locale) to
  `toLocaleString` / `toLocaleDateString` / `Intl.DateTimeFormat`. Defer
  any `Date.now()`-driven text to `useEffect` (see `ResetCountdown` in
  `src/components/daily-quests.tsx`).
- **README stays in sync with code.** Every behaviour, schema, API, env, or
  feature change must update the matching section here in the same change.
  Enforced by `.cursor/rules/readme-maintenance.mdc` (always-applied agent
  rule with section map + checklist).
- **Local-only practice modes don't touch server state.** When a feature is
  intentionally a warm-up (no scoring, no SRS, no streak, no coins), it
  must skip `/api/quiz/submit`, skip `notify*` calls, and skip any
  `CardView` / `KanaView` / `KanjiView` writes. Reading mode (kana) is
  the canonical example; new local-only modes should follow the same
  shape so the streak / coin contracts stay obvious to readers.

---

If something on a page feels off, the source-of-truth file is usually one of:

| Surface | File |
|---|---|
| Streak / freezes | `src/lib/streak.ts`, `src/lib/streak-freeze.ts` |
| Coins / quests | `src/lib/coins.ts` |
| SRS scheduling | `src/lib/srs.ts` |
| Achievements catalog | `src/lib/achievements.ts` |
| N5 Mastery model | `src/lib/n5-paths.ts` |
| Quiz generation | `src/lib/quiz.ts` |
| Time / timezone | `src/lib/time.ts` |
| Shop / Inventory catalog | `src/lib/shop.ts` |
| Dojo curriculum (Genki I + II) | `src/lib/dojo.ts` |
| Dojo lesson content (vocab + grammar + listening + drill banks; vocab `furigana` segments) | `src/lib/dojo-content.ts` |
| Kana → Hepburn romaji helpers (mora splitter for the Dojo vocab card) | `src/lib/japanese-romaji.ts` |
| Reading mode (kana) — stage metadata, day-of-cycle math, shuffle, types (client-safe) | `src/lib/reading.ts` |
| Reading mode (kana) — DB-backed deck loader (server-only) | `src/lib/reading-server.ts` |
| Reading mode word bank (seed + assertions) | `prisma/seed/reading-words.ts`, `prisma/seed.ts` |
| Per-user rate limits | `src/lib/rate-limit.ts` |
| `formatInt` (locale-stable numbers in client components) | `src/lib/utils.ts` |
| `/progress` data shape (used by both the page and the API) | `src/lib/progress-stats.ts` |
| Client `fetch` wrapper (429-aware, typed errors) | `src/lib/api-client.ts` |
| Browser-timezone self-healing sync | `src/lib/use-timezone-sync.ts` |
| In-app notification writers + types | `src/lib/notify.ts` |
| Notification card formatting (title / body / glyph / tone) | `src/lib/notify-format.ts` |
| Toast + bell-refresh client pub/sub | `src/lib/notification-bus.ts` |
