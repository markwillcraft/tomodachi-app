"use client"

// =====================================================================
// LessonView — study material before the drill
// ---------------------------------------------------------------------
// The user lands here when they click a section card on the lesson
// detail. We show them the actual *teaching* (grammar explanations,
// vocab flashcards, listening transcripts) and only unlock the
// "Start drill" CTA once they've gone through it.
//
// Gate per section kind:
//   * grammar   → scroll-to-end (IntersectionObserver on the footer
//                 sentinel).
//   * vocab     → must have flipped or paged through every flashcard.
//   * listening → scroll-to-end + every dialogue's "play audio"
//                 needs to have been clicked at least once.
//
// Already-passed sections show an "already passed" banner and an
// always-enabled "Start drill" button so retake-only flow doesn't
// force a re-read.
// =====================================================================

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Headphones,
  Languages,
  Lock,
  Volume2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { speakJapanese } from "@/lib/speech"
import { kanaToRomaji, splitMora } from "@/lib/japanese-romaji"
import type { DojoSectionKind } from "@/lib/dojo"
import type {
  FuriganaSegment,
  GrammarKeyKanji,
  GrammarPoint,
  ListeningPrompt,
  VocabItem,
} from "@/lib/dojo-content"

// ---------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------

export type LessonViewProps = {
  section: DojoSectionKind
  lessonId: string
  lessonNumber: number
  lessonTitle: string
  /** Where the "Start drill" button should send the user. Server
   *  builds it so we don't have to hard-code the route shape here. */
  drillHref: string
  /** Where "All sections" goes (the lesson detail page). */
  lessonHref: string
  intro: string
  grammar: readonly GrammarPoint[]
  /** Reading-aid kanji surfaced under the grammar stepper so users
   *  recognise the kanji words that appear in drill prompts. Empty
   *  array hides the panel — never null. */
  grammarKeyKanji: readonly GrammarKeyKanji[]
  vocab: readonly VocabItem[]
  listening: readonly ListeningPrompt[]
  /** True when this section is already passed — lets the user skip
   *  the gate. */
  alreadyPassed: boolean
  bestScorePct: number | null
}

// ---------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------

export function LessonView(props: LessonViewProps) {
  const {
    section,
    lessonId,
    lessonNumber,
    lessonTitle,
    drillHref,
    lessonHref,
    intro,
    grammar,
    grammarKeyKanji,
    vocab,
    listening,
    alreadyPassed,
    bestScorePct,
  } = props

  // Scroll-end gate — only used by listening (which is a vertical
  // dialogue list). Grammar and vocab are step-based now and gate
  // off "visited every page" instead of scroll position.
  const [scrolledEnd, setScrolledEnd] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (section !== "listening") return
    const node = sentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setScrolledEnd(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [section])

  // Grammar stepper progress.
  const [grammarSeenCount, setGrammarSeenCount] = useState(0)
  const grammarAllSeen =
    grammarSeenCount >= grammar.length && grammar.length > 0

  // Vocab flashcard progress.
  const [vocabSeenCount, setVocabSeenCount] = useState(0)
  const vocabAllSeen = vocabSeenCount >= vocab.length && vocab.length > 0

  // Listening "played each audio" gate.
  const [listenedIds, setListenedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const allListened =
    listening.length > 0 && listenedIds.size >= listening.length

  // Combined unlock per section.
  let unlocked = false
  if (alreadyPassed) {
    unlocked = true
  } else if (section === "grammar") {
    unlocked = grammarAllSeen
  } else if (section === "vocab") {
    unlocked = vocabAllSeen
  } else if (section === "listening") {
    unlocked = scrolledEnd && allListened
  }

  return (
    <div className="space-y-3">
      {/* Lesson banner */}
      <header className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SectionGlyph section={section} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Lesson {lessonNumber} · {SECTION_LABEL[section]} · Study
              </p>
              <h1 className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
                {lessonTitle}
              </h1>
            </div>
          </div>
          {alreadyPassed ? (
            <PassedBadge bestScorePct={bestScorePct} />
          ) : (
            <UnlockHint section={section} unlocked={unlocked} />
          )}
        </div>
        {intro && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}
      </header>

      {/* Section body */}
      {section === "grammar" && (
        <>
          <GrammarLesson
            points={grammar}
            onSeenCountChange={setGrammarSeenCount}
          />
          {grammarKeyKanji.length > 0 && (
            <KeyKanjiPanel items={grammarKeyKanji} />
          )}
        </>
      )}
      {section === "vocab" && (
        <VocabFlashcards
          items={vocab}
          onSeenCountChange={setVocabSeenCount}
        />
      )}
      {section === "listening" && (
        <ListeningTranscripts
          prompts={listening}
          listenedIds={listenedIds}
          onPlay={(id) =>
            setListenedIds((prev) => {
              if (prev.has(id)) return prev
              const next = new Set(prev)
              next.add(id)
              return next
            })
          }
        />
      )}

      {/* Sentinel for scroll-end (listening only). */}
      {section === "listening" && (
        <div ref={sentinelRef} aria-hidden className="h-1" />
      )}

      {/* Drill CTA */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
          unlocked
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card"
            : "border-border bg-card",
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {unlocked ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={2.25} />
              <span>
                Lesson read — you can start the drill whenever you&apos;re ready.
              </span>
            </>
          ) : (
            <>
              <Lock className="size-4" strokeWidth={2.25} />
              <span>{LOCK_HINT[section]}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={lessonHref}>
              <ArrowLeft className="size-3.5" strokeWidth={2.5} />
              All sections
            </Link>
          </Button>
          <Button
            asChild={unlocked}
            disabled={!unlocked}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {unlocked ? (
              <Link href={drillHref}>
                Start drill
                <ArrowRight className="size-3.5" strokeWidth={2.5} />
              </Link>
            ) : (
              <span>
                Start drill
                <ArrowRight className="ml-1.5 inline size-3.5" strokeWidth={2.5} />
              </span>
            )}
          </Button>
        </div>
      </div>
      {/* lessonId passed through for stable key isolation if a parent
          ever decides to swap sections without remounting. */}
      <input type="hidden" value={lessonId} readOnly aria-hidden />
    </div>
  )
}

// ---------------------------------------------------------------------
// Header bits
// ---------------------------------------------------------------------

const SECTION_LABEL: Record<DojoSectionKind, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
}

const LOCK_HINT: Record<DojoSectionKind, string> = {
  grammar: "Step through every grammar point to unlock the drill.",
  vocab: "Flip through every flashcard to unlock the drill.",
  listening: "Play every dialogue and scroll to the bottom to unlock the drill.",
}

function SectionGlyph({ section }: { section: DojoSectionKind }) {
  const Icon =
    section === "grammar"
      ? GraduationCap
      : section === "vocab"
        ? Languages
        : Headphones
  const tone =
    section === "grammar"
      ? "text-violet-600 dark:text-violet-300"
      : section === "vocab"
        ? "text-amber-600 dark:text-amber-300"
        : "text-sky-600 dark:text-sky-300"
  return (
    <span className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.05] ring-1 ring-inset ring-foreground/10">
      <Icon className={cn("size-5", tone)} strokeWidth={2.25} />
    </span>
  )
}

function PassedBadge({ bestScorePct }: { bestScorePct: number | null }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="size-3.5" strokeWidth={2.5} />
      Already passed{bestScorePct != null ? ` · best ${bestScorePct}%` : ""}
    </div>
  )
}

function UnlockHint({
  section,
  unlocked,
}: {
  section: DojoSectionKind
  unlocked: boolean
}) {
  if (unlocked) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5" strokeWidth={2.5} />
        Drill ready
      </div>
    )
  }
  const Icon =
    section === "vocab" ? BookOpenCheck : section === "listening" ? Volume2 : Lock
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      <Icon className="size-3.5" strokeWidth={2.5} />
      Read first
    </div>
  )
}

// ---------------------------------------------------------------------
// Inline highlighting helpers
// ---------------------------------------------------------------------
// Two pieces of inline formatting we apply to authored Genki content:
//
// 1. RichExplanation — handles English prose that has Japanese
//    characters embedded (e.g. "は marks the topic, and です covers
//    'is/am/are'.") as well as `*foo*` markdown italic for romaji
//    pronunciation hints (`*wa*`, `*desu*`). Without this, the
//    asterisks render literally and the JP characters blend into the
//    paragraph.
//
// 2. HighlightedJp — particle highlighter for example sentences. It
//    walks the JP string and tints particles + the polite copula so
//    learners can pattern-match at a glance. Tone follows the section
//    color (violet for grammar, sky for listening).
//
// Particle list is intentionally small — only N5-relevant single-char
// particles plus the multi-char から / まで / より so we don't
// accidentally rainbow-color hiragana that *isn't* a particle (e.g.
// the か at the end of a question word vs. the か in 何時か).
// We treat them positionally where possible; for now we keep it
// permissive since the cost of an over-tint is low compared to the
// gain in readability.

// Multi-char tokens *must* come before single-char alternations in a
// regex alternation, otherwise the engine would lock onto the
// single-char prefix first (e.g. か beats from から).
const PARTICLE_SPLIT_RE =
  /(から|まで|より|ですか|ましょう|ません|ます|です|[はをにでがのとへもよねか])/g

const PARTICLE_TOKENS = new Set([
  "は",
  "を",
  "に",
  "で",
  "が",
  "の",
  "と",
  "へ",
  "も",
  "よ",
  "ね",
  "か",
  "から",
  "まで",
  "より",
])

const COPULA_TOKENS = new Set([
  "です",
  "ですか",
  "ません",
  "ます",
  "ましょう",
])

type Tone = "violet" | "sky"

function jpAccent(tone: Tone) {
  return tone === "violet"
    ? "font-bold text-violet-700 dark:text-violet-300"
    : "font-bold text-sky-700 dark:text-sky-300"
}

const COPULA_ACCENT = "font-bold text-rose-600 dark:text-rose-300"

function HighlightedJp({
  text,
  tone = "violet",
}: {
  text: string
  tone?: Tone
}) {
  // `String.split` with a global regex containing a capture group
  // returns an array of [chunk, token, chunk, token, ..., chunk]. We
  // tag tokens via the two Sets above so the regex `lastIndex`
  // stateful-ness never matters for classification.
  const parts = text.split(PARTICLE_SPLIT_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null
        if (COPULA_TOKENS.has(part)) {
          return (
            <span key={i} className={COPULA_ACCENT}>
              {part}
            </span>
          )
        }
        if (PARTICLE_TOKENS.has(part)) {
          return (
            <span key={i} className={jpAccent(tone)}>
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// Matches `*foo*` (romaji italics) OR contiguous JP runs (hiragana,
// katakana, kanji, chouonpu, 々). Anything else is plain text.
const EXPLANATION_TOKEN_RE =
  /\*([^*\n]+)\*|([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff々ー]+)/g

function RichExplanation({
  text,
  tone = "violet",
}: {
  text: string
  tone?: Tone
}) {
  const out: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  // Reset state to be safe in case the regex was used elsewhere.
  EXPLANATION_TOKEN_RE.lastIndex = 0
  while ((match = EXPLANATION_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>,
      )
    }
    if (match[1]) {
      out.push(
        <em
          key={key++}
          className="not-italic font-mono text-[0.92em] text-foreground/85"
        >
          {match[1]}
        </em>,
      )
    } else if (match[2]) {
      out.push(
        <span key={key++} className={jpAccent(tone)}>
          {match[2]}
        </span>,
      )
    }
    lastIndex = EXPLANATION_TOKEN_RE.lastIndex
  }
  if (lastIndex < text.length) {
    out.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }
  return <>{out}</>
}

// ---------------------------------------------------------------------
// Swipe + keyboard navigation hook
// ---------------------------------------------------------------------
// Shared by stepper experiences (grammar points, vocab flashcards).
// Returns touch handlers for left/right swipes plus a keyboard
// listener for ArrowLeft / ArrowRight on the host element.
//
// Threshold of 40px keeps tap-vs-swipe disambiguation stable on touch
// targets without requiring a full screen drag.

function useStepperNav({
  onPrev,
  onNext,
}: {
  onPrev: () => void
  onNext: () => void
}) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  // Mobile browsers fire a synthesized `click` after `touchend`. If
  // that touch was actually a swipe, we don't want the click handler
  // (e.g. flip card) to also fire. `guardClick` wraps an onClick and
  // bails if a swipe just landed.
  const justSwiped = useRef(false)

  const bind = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      startX.current = t.clientX
      startY.current = t.clientY
      justSwiped.current = false
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current == null || startY.current == null) return
      const t = e.changedTouches[0]
      const dx = t.clientX - startX.current
      const dy = t.clientY - startY.current
      startX.current = null
      startY.current = null
      // Ignore mostly-vertical motions so the page can still scroll.
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
      justSwiped.current = true
      if (dx < 0) onNext()
      else onPrev()
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        onPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        onNext()
      }
    },
  }

  function guardClick<T extends (...args: never[]) => void>(fn: T) {
    return (...args: Parameters<T>) => {
      if (justSwiped.current) {
        justSwiped.current = false
        return
      }
      fn(...args)
    }
  }

  return { bind, guardClick }
}

// ---------------------------------------------------------------------
// Grammar lesson — stepper (one point per card)
// ---------------------------------------------------------------------

function GrammarLesson({
  points,
  onSeenCountChange,
}: {
  points: readonly GrammarPoint[]
  onSeenCountChange: (count: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set())
  const total = points.length

  // Mark the current point as seen. The updater stays *pure* — calling
  // the parent's `onSeenCountChange` here would trip React 19's
  // "setState during render" guard because state updater functions can
  // be invoked twice during reconciliation. Bubble the count to the
  // parent from the dedicated effect below instead.
  useEffect(() => {
    const point = points[index]
    if (!point) return
    setSeen((prev) => {
      if (prev.has(point.id)) return prev
      const next = new Set(prev)
      next.add(point.id)
      return next
    })
  }, [index, points])

  useEffect(() => {
    onSeenCountChange(seen.size)
  }, [seen, onSeenCountChange])

  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1))
  const { bind } = useStepperNav({ onPrev: goPrev, onNext: goNext })

  if (total === 0) {
    return (
      <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        No grammar content authored for this lesson yet.
      </p>
    )
  }

  const p = points[index]
  const seenCount = seen.size
  const progressPct = Math.round((seenCount / total) * 100)

  return (
    <div className="space-y-3">
      {/* Progress strip */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <GraduationCap className="size-4 text-violet-600" strokeWidth={2.25} />
          <span className="font-semibold tabular-nums">
            Point {index + 1} / {total}
          </span>
          <span className="text-muted-foreground">· {seenCount} seen</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-foreground/[0.06] sm:block">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-violet-600 transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="tabular-nums text-[11px] font-semibold text-muted-foreground">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Point card */}
      <article
        {...bind}
        tabIndex={0}
        aria-roledescription="slide"
        aria-label={`Grammar point ${index + 1} of ${total}`}
        className="overflow-hidden rounded-2xl border bg-card p-5 outline-none ring-violet-500/30 transition-shadow focus-visible:ring-2 sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Point {index + 1} of {total}
          </span>
          <span className="rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent px-3 py-1.5 font-mono text-base font-bold tracking-tight sm:text-lg">
            <HighlightedJp text={p.pattern} tone="violet" />
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          {p.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-[17px] sm:leading-[1.7]">
          <RichExplanation text={p.explanation} tone="violet" />
        </p>
        {p.examples.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Examples
            </p>
            <ul className="space-y-2">
              {p.examples.map((ex, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.04] via-background/50 to-background/50 p-3"
                >
                  <button
                    onClick={() => speakJapanese(ex.jp)}
                    className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card transition-all hover:-translate-y-px hover:border-violet-500/40 hover:bg-accent"
                    aria-label="Play"
                  >
                    <Volume2 className="size-4" strokeWidth={2.25} />
                  </button>
                  <div className="min-w-0 flex-1 leading-snug">
                    <p className="text-base font-medium sm:text-lg">
                      <HighlightedJp text={ex.jp} tone="violet" />
                    </p>
                    <p className="text-xs italic text-muted-foreground sm:text-sm">
                      {ex.romaji}
                    </p>
                    <p className="text-xs text-foreground/80 sm:text-sm">
                      {ex.en}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* Pager */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={index === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" strokeWidth={2.5} />
          Prev
        </Button>
        <div className="flex items-center gap-1">
          {points.map((point, i) => (
            <button
              key={point.id}
              type="button"
              aria-label={`Go to point ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "size-2 rounded-full transition-colors",
                i === index
                  ? "bg-violet-500"
                  : seen.has(point.id)
                    ? "bg-foreground/40"
                    : "bg-foreground/10",
              )}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={index === total - 1}
          className="gap-1.5"
        >
          Next
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </Button>
      </div>

      {/* Hint shown only on touch devices, but mobile-first wording is fine on desktop too. */}
      <p className="text-center text-[11px] text-muted-foreground sm:hidden">
        Swipe left / right to switch points
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------
// Key kanji panel — reading aid before grammar drills
// ---------------------------------------------------------------------
// Drill prompts are written in natural Japanese with kanji that often
// haven't been formally introduced in the lesson's vocab section
// (e.g. 先生 / 召し上がる show up in N4-L19's grammar drills even
// though they aren't in that lesson's vocab list). This panel sits
// between the grammar stepper and the "Start drill" CTA to give the
// user a single place to recognise those words first — so the drill
// itself is a grammar test, not a reading test.

function KeyKanjiPanel({
  items,
}: {
  items: readonly GrammarKeyKanji[]
}) {
  return (
    <section
      aria-labelledby="key-kanji-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-violet-500/25",
        "bg-gradient-to-br from-violet-500/[0.10] via-card to-card",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-3 p-4 sm:p-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-inset ring-violet-500/30">
              <Languages
                className="size-4 text-violet-600 dark:text-violet-300"
                strokeWidth={2.25}
              />
            </span>
            <div>
              <h2
                id="key-kanji-heading"
                className="text-sm font-bold tracking-tight"
              >
                Key kanji for the drill
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Skim these so the drill is a grammar test, not a reading
                one.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 ring-1 ring-inset ring-violet-500/20 dark:text-violet-300">
            {items.length} word{items.length === 1 ? "" : "s"}
          </span>
        </header>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <li
              key={it.kanji}
              className="flex items-baseline gap-2.5 rounded-lg border bg-card/80 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => speakJapanese(it.kanji)}
                className="group/play inline-flex shrink-0 items-baseline gap-1 rounded-md px-1 py-0.5 text-base font-bold leading-tight text-foreground transition-colors hover:bg-violet-500/10"
                aria-label={`Play audio for ${it.kanji}`}
                title="Play audio"
              >
                <span>{it.kanji}</span>
                <Volume2
                  className="size-3 text-muted-foreground transition-colors group-hover/play:text-violet-600"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </button>
              <span className="font-japanese text-xs text-muted-foreground">
                {it.reading}
              </span>
              <span className="ml-auto text-right text-xs leading-snug text-foreground/80">
                {it.gloss}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Vocab flashcards
// ---------------------------------------------------------------------

function VocabFlashcards({
  items,
  onSeenCountChange,
}: {
  items: readonly VocabItem[]
  onSeenCountChange: (count: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // Track which flashcard ids the user has *visited*. They count as
  // "seen" the moment they land on the card; flipping is encouraged
  // but not required — users who already know a word shouldn't be
  // forced into a flip animation just to satisfy the gate.
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set())

  // Same rule as GrammarLesson: keep the updater pure so React 19's
  // strict reconciliation doesn't re-run side effects, and notify the
  // parent from a dedicated effect that watches the seen set.
  useEffect(() => {
    const item = items[index]
    if (!item) return
    setFlipped(false)
    setSeen((prev) => {
      if (prev.has(item.id)) return prev
      const next = new Set(prev)
      next.add(item.id)
      return next
    })
  }, [index, items])

  useEffect(() => {
    onSeenCountChange(seen.size)
  }, [seen, onSeenCountChange])

  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => setIndex((i) => Math.min(items.length - 1, i + 1))
  const { bind, guardClick } = useStepperNav({ onPrev: goPrev, onNext: goNext })

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        No vocabulary in this lesson yet.
      </p>
    )
  }

  const item = items[index]
  const total = items.length
  const seenCount = seen.size
  const progressPct = Math.round((seenCount / total) * 100)

  return (
    <div className="space-y-3">
      {/* Progress strip */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <BookOpenCheck className="size-4 text-amber-600" strokeWidth={2.25} />
          <span className="font-semibold tabular-nums">
            {index + 1} / {total}
          </span>
          <span className="text-muted-foreground">
            · {seenCount} seen
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-foreground/[0.06] sm:block">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="tabular-nums text-[11px] font-semibold text-muted-foreground">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={guardClick(() => setFlipped((s) => !s))}
        {...bind}
        className={cn(
          "group relative flex min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 text-center outline-none ring-amber-500/30 transition-all hover:-translate-y-px hover:border-amber-500/40 hover:shadow-md focus-visible:ring-2",
          flipped && "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-card to-card",
        )}
      >
        <span className="absolute right-3 top-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {flipped ? "Meaning" : "Tap to flip"}
        </span>
        <span className="absolute left-3 top-3 rounded-md bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {item.partOfSpeech}
        </span>

        {!flipped ? (
          <>
            <VocabReading item={item} />
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                speakJapanese(item.kana)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  speakJapanese(item.kana)
                }
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-px hover:bg-accent"
            >
              <Volume2 className="size-3.5" strokeWidth={2.25} />
              Play
            </span>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.english}
            </p>
            <p className="text-sm italic text-muted-foreground">
              {item.romaji}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.kanji ? `${item.kanji} · ${item.kana}` : item.kana}
            </p>
          </>
        )}
      </button>

      {/* Pager */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={index === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" strokeWidth={2.5} />
          Prev
        </Button>
        <div className="flex items-center gap-1">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "size-2 rounded-full transition-colors",
                i === index
                  ? "bg-amber-500"
                  : seen.has(items[i].id)
                    ? "bg-foreground/40"
                    : "bg-foreground/10",
              )}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={index === total - 1}
          className="gap-1.5"
        >
          Next
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </Button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground sm:hidden">
        Swipe left / right to switch · tap card to flip
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------
// Vocab card front — kanji ↔ reading display
// ---------------------------------------------------------------------
// Two complementary visual aids on the front face:
//
//   1. Headword line. If the vocab item ships a `furigana` segment
//      array we render it as native HTML <ruby> so each kana span
//      sits directly above the kanji it spells. Words without
//      `furigana` (most of the catalog right now — see
//      `dojo-content.ts`) fall back to the legacy stacked layout
//      (kanji on top, kana below as a secondary line) so existing
//      content keeps working unchanged.
//
//   2. Per-mora colored romaji. ALWAYS shown, even when furigana is
//      present. This is the part that answers the user-facing
//      question "which kana is wa, which is ta, which is shi?" —
//      each mora gets its own colored cell with the kana char on
//      top and the romaji syllable underneath. Color cycles through
//      five tones so adjacent mora are always distinguishable; we
//      avoid amber to keep contrast against the card's amber hover
//      tint.

const MORA_COLORS = [
  "text-rose-500 dark:text-rose-300",
  "text-sky-500 dark:text-sky-300",
  "text-emerald-500 dark:text-emerald-300",
  "text-violet-500 dark:text-violet-300",
  "text-fuchsia-500 dark:text-fuchsia-300",
] as const

function VocabReading({ item }: { item: VocabItem }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {item.furigana && item.furigana.length > 0 ? (
        <RubyHeadword segments={item.furigana} />
      ) : (
        <>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {item.kanji ?? item.kana}
          </p>
          {item.kanji && (
            <p className="text-base text-muted-foreground">{item.kana}</p>
          )}
        </>
      )}
      <MoraRomajiRow kana={item.kana} />
    </div>
  )
}

function RubyHeadword({ segments }: { segments: readonly FuriganaSegment[] }) {
  // `[&_rt]` styles the browser-native ruby annotation slot so the
  // furigana stays small and muted relative to the base kanji while
  // keeping native ruby positioning + accessibility (screen readers
  // announce base then rt).
  return (
    <p className="flex flex-wrap items-end justify-center gap-x-1 text-4xl font-semibold tracking-tight sm:text-5xl [&_rt]:text-[0.32em] [&_rt]:font-medium [&_rt]:text-muted-foreground [&_rt]:tracking-wide">
      {segments.map((seg, i) =>
        seg.reading ? (
          <ruby key={i}>
            {seg.base}
            <rt>{seg.reading}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.base}</span>
        ),
      )}
    </p>
  )
}

function MoraRomajiRow({ kana }: { kana: string }) {
  const mora = splitMora(kana)
  if (mora.length === 0) return null
  return (
    <div
      role="presentation"
      className="mt-1 flex flex-wrap items-end justify-center gap-x-2 gap-y-1"
    >
      {mora.map((m, i) => {
        const tone = MORA_COLORS[i % MORA_COLORS.length]
        const romaji = kanaToRomaji(m)
        return (
          <span
            key={`${i}-${m}`}
            className={cn(
              "flex flex-col items-center leading-none",
              tone,
            )}
          >
            <span className="text-base font-medium sm:text-lg">{m}</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
              {romaji}
            </span>
          </span>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------
// Listening — transcript per dialogue
// ---------------------------------------------------------------------

function ListeningTranscripts({
  prompts,
  listenedIds,
  onPlay,
}: {
  prompts: readonly ListeningPrompt[]
  listenedIds: ReadonlySet<string>
  onPlay: (id: string) => void
}) {
  if (prompts.length === 0) {
    return (
      <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        No listening dialogues in this lesson yet.
      </p>
    )
  }
  const playedCount = listenedIds.size
  const progressPct = Math.round((playedCount / prompts.length) * 100)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <Headphones className="size-4 text-sky-600" strokeWidth={2.25} />
          <span className="font-semibold tabular-nums">
            {playedCount} / {prompts.length} played
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-foreground/[0.06] sm:block">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="tabular-nums text-[11px] font-semibold text-muted-foreground">
            {progressPct}%
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {prompts.map((p, i) => {
          const played = listenedIds.has(p.id)
          return (
            <li
              key={p.id}
              className={cn(
                "rounded-2xl border bg-card p-4 transition-colors",
                played && "border-sky-500/30 bg-gradient-to-br from-sky-500/[0.06] via-card to-card",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Dialogue {i + 1}
                </span>
                <button
                  onClick={() => {
                    speakJapanese(p.jp)
                    onPlay(p.id)
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:-translate-y-px",
                    played
                      ? "bg-sky-500/15 text-sky-700 ring-1 ring-inset ring-sky-500/30 hover:bg-sky-500/25 dark:text-sky-200"
                      : "bg-sky-600 text-white hover:bg-sky-700",
                  )}
                >
                  <Volume2 className="size-3.5" strokeWidth={2.25} />
                  {played ? "Replay" : "Play audio"}
                </button>
              </div>
              <div className="mt-2 space-y-0.5 leading-snug">
                <p className="text-sm font-medium">
                  <HighlightedJp text={p.jp} tone="sky" />
                </p>
                <p className="text-[11px] italic text-muted-foreground">
                  {p.romaji}
                </p>
                <p className="text-[11px] text-foreground/80">{p.english}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
