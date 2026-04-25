# Furigana Backfill (full vocab catalog)

> Status: Proposed
> Priority: P2  ·  Est. effort: M  ·  Depends on: —

## Why

The vocab flip card already supports per-kanji ruby annotations via the
optional `furigana?: FuriganaSegment[]` field on `VocabItem`
(`src/lib/dojo-content.ts`). Right now only the 13 kanji-bearing items in
N5 Lesson 1 are backfilled, so every other lesson falls back to the
stacked kanji/kana layout. That layout works, but a learner staring at
`私は学生です` still has to *guess* which kana belong to which kanji.
Backfilling the rest of the catalog turns every kanji card into a clear
"this kanji says this" lesson without any UI work.

This is **content/tooling**, not a feature. No new screens, no new
schema, no API surface. The render path already ships.

## Goals / non-goals

**In:**
- Add `furigana` arrays to all ~383 remaining kanji-bearing vocab items.
- Build a one-off script (`scripts/backfill-furigana.ts`) that uses the
  existing Gemini integration to draft segmentations, then validates
  them mechanically before they're written to disk.
- Add a permanent invariant test that asserts, for every `VocabItem` with
  `furigana`, joining the segments' `base` reproduces `kanji ?? kana`
  and joining `reading ?? base` reproduces `kana`. This is the authoring
  contract spelled out in the JSDoc on `FuriganaSegment` — make it
  enforceable.

**Out:**
- Runtime kanji → reading derivation (kuromoji.js, JMdict at runtime).
  Considered as Option 3 in the original analysis; deferred unless we
  pass ~1000 vocab items or open lesson contributions to the community.
- Furigana on grammar example sentences or listening prompts. Vocab
  cards only — that's the surface where users browse kanji deliberately.
- New UI for toggling furigana off/on. Out of scope until a user asks.

## Scope (real numbers as of writing)

From `src/lib/dojo-content.ts`:

| Metric | Count |
|---|---|
| Total `VocabItem` entries | 474 |
| Items with `kanji` set | 395 |
| Items already backfilled (N5 L1) | 13 |
| **Items remaining to backfill** | **~382** |
| Pure-kana items (no work needed) | 79 |

## Approach

Three options were weighed; **Option B (LLM-assisted with a hard
mechanical validator)** is the recommended path. Option A is the
fallback if Gemini quality disappoints; Option C is the long-term play
if the catalog ever grows past the point where one-off tooling pays
back.

### Option A — Manual

A human (or a Japanese-tutor freelancer) writes each segmentation. Most
N5/N4 entries fall into three patterns:

- single-kanji nouns: `[{ base: "本", reading: "ほん" }]` → ~10s
- kanji + okurigana verbs: `食べる` →
  `[{ base: "食", reading: "た" }, { base: "べる" }]` → ~20s
- compounds: `学生` →
  `[{ base: "学", reading: "がく" }, { base: "生", reading: "せい" }]` → ~30s

Realistic average: ~1 min/item × 382 ≈ **6–7 hours of focused work**.
Cheap to delegate, but bottlenecked on a single human's attention.

### Option B — LLM-assisted + hard validator (recommended)

Single-shot Gemini call per batch, validated mechanically. Pipeline:

1. `scripts/backfill-furigana.ts` reads every `VocabItem` from
   `src/lib/dojo-content.ts` where `kanji != null` and `furigana ==
   null`.
2. Batches them (~30 per call) and sends each batch to Gemini with a
   strict schema prompt + 5 few-shot examples (single kanji,
   verb+okurigana, compound, jukujikun like `今日`, mixed kanji/kana
   like `お母さん`).
3. For each returned segmentation, run the **invariant validator**:
   - `segments.map(s => s.base).join("") === item.kanji`
   - `segments.map(s => s.reading ?? s.base).join("") === item.kana`
4. Items that pass: write back into `dojo-content.ts` (alphabetised /
   in-place edit, preserving comments).
5. Items that fail: dump to `scripts/furigana-failures.json` with the
   raw model output for human review. Re-run cycle.

**Effort:** ~30 min for the script, ~30 min for the model run, ~1–2 h
for spot-checking the model-flagged failures. Total ≈ **half a day**.
Cost: pennies — Gemini Flash, ~13 batches.

The validator is the keystone — it's why this approach is safe. We
*never* trust raw LLM output; we trust the mechanical invariant. Bad
segmentations can't silently land.

### Option C — Build-time JMdict lookup (deferred)

Use the [Doublevil/JmdictFurigana](https://github.com/Doublevil/JmdictFurigana)
dataset (~200k entries with per-kanji reading breakdown sourced from
JMdict) as a build step. Joins on `(kanji, kana)` and emits a
generated `vocab-furigana.generated.ts`.

**Effort:** ~1 day. **Win:** zero manual work, scales to every future
lesson + community contributions. **Cost:** dataset is ~5MB, must be
vendored or fetched at build, and adds a generated-file convention to
the repo. Defer until we either (a) pass ~1000 vocab items, or (b)
allow lesson contributions from non-maintainers.

## Source files (planned)

- `scripts/backfill-furigana.ts` — Node script (run with `tsx`),
  invokes `enrichWithFurigana()` from `src/lib/gemini.ts` (new helper),
  validates, writes back.
- `src/lib/gemini.ts` — append `enrichWithFurigana(items)` following
  the `enrichRomajiBatch` pattern (JSON response, batch input).
- `src/lib/furigana-validation.ts` — pure function:
  `validateFurigana(item, segments) → { ok, reason? }`. Imported by
  both the backfill script and the test.
- `src/__tests__/furigana-invariants.test.ts` (or equivalent under the
  existing test runner) — iterates every `VocabItem` with `furigana`
  and asserts the invariant. CI-blocking.
- Edits in place in `src/lib/dojo-content.ts` for the 382 items.

## Open questions

- **Trust threshold.** Do we ship Gemini output that passes the
  invariant unreviewed, or do we eyeball every diff? Recommend:
  unreviewed for items where both sides of the invariant pass *and*
  every segment has at most one kanji char in `base`. Eyeball the rest
  (compounds + jukujikun — small subset).
- **Edits to the file format.** `dojo-content.ts` is currently a hand-
  edited TS literal. The script needs to either (a) regex-patch each
  line, or (b) move vocab into a sidecar JSON the script owns and the
  TS file imports. Recommend (a) for this round — keeps the diff
  reviewable and avoids restructuring 6300 lines.
- **Re-running on new lessons.** When a future lesson lands without
  `furigana` set, do we run the script as a pre-commit hook, or just
  document it as part of "adding a new lesson"? Recommend: documented
  step + the invariant test catches missing entries if we ever add a
  required-furigana flag later.
- **What about `お母さん`?** Mixed kana+kanji+kana. The segment shape
  already handles it: `[{ base: "お" }, { base: "母", reading: "かあ" },
  { base: "さん" }]`. Add to the few-shot prompt examples explicitly.

## Done = acceptance checklist

- [ ] `scripts/backfill-furigana.ts` runs end-to-end and produces a
      diff against `src/lib/dojo-content.ts`.
- [ ] `src/lib/furigana-validation.ts` exports a pure validator and is
      unit-tested against the JSDoc examples.
- [ ] All 395 kanji-bearing `VocabItem` entries have a `furigana` array
      that passes the invariant.
- [ ] CI test fails if any `VocabItem` with `furigana` violates the
      invariant.
- [ ] Manual smoke check: visit `/dojo/n5/n5-l1/vocab` through
      `/dojo/n4/n4-l23/vocab`; ruby renders for every kanji card.
- [ ] `TODO(furigana)` comment in `dojo-content.ts` (added during the
      N5 L1 pilot) is removed.
- [ ] `README.md` updated.

## README touchpoints when shipped

- `## Feature reference` → `### Dojo` subsection: add a sentence noting
  vocab cards now ship full per-kanji ruby across the whole catalog, and
  point to `src/lib/furigana-validation.ts` as the source of truth for
  the authoring contract.
- Bottom-of-README source-of-truth table: add
  `src/lib/furigana-validation.ts`.
- If we add the helper to `src/lib/gemini.ts`, mention it under the
  Gemini integration paragraph (no new section needed — same file).
