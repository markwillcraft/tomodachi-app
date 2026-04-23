"use client"

// =====================================================================
// DrillRunner
// ---------------------------------------------------------------------
// Owns the entire drill UX for one section (grammar / vocab /
// listening). Responsible for:
//   1. Shuffling the question pool and capping length per attempt.
//   2. Stepping through one question at a time with instant feedback
//      and (optionally) an explanation.
//   3. Submitting the final answers to /api/dojo/submit-section.
//   4. Rendering the results screen + popping the LessonCompleteModal
//      when the user just finished the lesson.
//
// Listening drills are a thin variant: BEFORE the question we render a
// "play audio" header that uses the browser's SpeechSynthesis to read
// the JP line aloud, plus a transcript/translation reveal.
// =====================================================================

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  Coins,
  Eye,
  EyeOff,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { speakJapanese } from "@/lib/speech"
import type {
  DrillQuestion,
  ListeningPrompt,
} from "@/lib/dojo-content"
import type { DojoLevel, DojoSectionKind } from "@/lib/dojo"
import {
  LessonCompleteModal,
  type LessonCompleteSummary,
} from "@/app/dojo/lesson-complete-modal"

// Cap drill length to keep sessions bite-sized. Vocab pools can be
// 20+ items; we randomise to a fixed-size sub-pool per attempt so
// retakes feel different and the UX time-boxes itself.
const PER_ATTEMPT_CAP: Record<DojoSectionKind, number> = {
  grammar: 10,
  vocab: 12,
  listening: 8,
}

type Answer = {
  questionId: string
  pickedIndex: number
  isCorrect: boolean
  timeMs: number
}

type SubmitResponse = {
  attemptId: number
  score: {
    total: number
    correct: number
    pct: number
    passed: boolean
    passThreshold: number
  }
  progress: {
    bestScorePct: number
    attempts: number
    passedAt: string | null
    newlyPassed: boolean
    newlyCompletedLesson: boolean
  }
  coins: {
    earned: number
    reasons: Array<{ reason: string; amount: number }>
  }
  newlyUnlocked: Array<{ id: string; title: string }>
}

export type DrillRunnerProps = {
  lessonId: string
  lessonNumber: number
  lessonTitle: string
  lessonJpTitle: string
  section: DojoSectionKind
  questions: readonly DrillQuestion[]
  /** Listening prompts. Empty for non-listening sections. The order
   *  here lines up with the questions on the prompt's `.question`. */
  listening: readonly ListeningPrompt[]
  passThreshold: number
  nextLessonId: string | null
  nextLessonLevel: DojoLevel | null
  existingPassedAt: string | null
  /** /dojo/{level}/{lessonId} — destination for "Back to lesson"
   *  (shows the user every section's progress so they can pick what
   *  to do next). */
  lessonHref: string
  /** /dojo/{level}/{lessonId}/{section} — the lesson view for this
   *  exact section. Surfaced as "Re-read lesson" so the user can
   *  freshen up before retaking after a fail. */
  sectionLessonHref: string
}

export function DrillRunner(props: DrillRunnerProps) {
  const {
    lessonId,
    lessonNumber,
    lessonTitle,
    lessonJpTitle,
    section,
    questions,
    listening,
    passThreshold,
    nextLessonId,
    nextLessonLevel,
    lessonHref,
    sectionLessonHref,
  } = props

  const [seed, setSeed] = useState(0)
  const drillItems = useMemo(
    () => buildDrillRun(section, questions, listening, seed),
    [section, questions, listening, seed],
  )
  const total = drillItems.length

  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [startedAt, setStartedAt] = useState<number>(() => Date.now())
  const [phase, setPhase] = useState<"drill" | "submitting" | "results">(
    "drill",
  )
  const [serverResult, setServerResult] = useState<SubmitResponse | null>(
    null,
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showCelebrate, setShowCelebrate] = useState(false)

  const router = useRouter()

  if (total === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
        No drill questions available for this section yet.
      </div>
    )
  }

  const item = drillItems[step]
  const question = item.question

  function handlePick(idx: number) {
    if (picked !== null) return
    setPicked(idx)
  }

  function handleNext() {
    if (picked === null) return
    const elapsed = Math.max(0, Date.now() - startedAt)
    const isCorrect = picked === question.correctIndex
    const newAnswer: Answer = {
      questionId: question.id,
      pickedIndex: picked,
      isCorrect,
      timeMs: elapsed,
    }
    const nextAnswers = [...answers, newAnswer]
    setAnswers(nextAnswers)
    setPicked(null)
    setStartedAt(Date.now())
    if (step + 1 < total) {
      setStep(step + 1)
    } else {
      void submit(nextAnswers)
    }
  }

  async function submit(finalAnswers: Answer[]) {
    setPhase("submitting")
    setSubmitError(null)
    try {
      const res = await fetch("/api/dojo/submit-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          section,
          answers: finalAnswers.map((a) => ({
            questionId: a.questionId,
            pickedIndex: a.pickedIndex,
            timeMs: a.timeMs,
          })),
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }))
        throw new Error(error || "Submit failed")
      }
      const data = (await res.json()) as SubmitResponse
      setServerResult(data)
      setPhase("results")
      if (data.progress.newlyCompletedLesson) {
        setShowCelebrate(true)
      }
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed")
      setPhase("results")
    }
  }

  function handleRetake() {
    setSeed((s) => s + 1)
    setStep(0)
    setPicked(null)
    setAnswers([])
    setStartedAt(Date.now())
    setServerResult(null)
    setSubmitError(null)
    setPhase("drill")
  }

  // -------------------------------------------------------------------
  // Results phase
  // -------------------------------------------------------------------
  if (phase === "results") {
    const correct = answers.filter((a) => a.isCorrect).length
    const pctClient = total === 0 ? 0 : Math.round((correct / total) * 100)
    const pct = serverResult?.score.pct ?? pctClient
    const passed = serverResult?.score.passed ?? pct >= passThreshold

    const summary: LessonCompleteSummary | null = serverResult?.progress
      .newlyCompletedLesson
      ? {
          lessonId,
          lessonNumber,
          lessonTitle,
          jpTitle: lessonJpTitle,
          coinsEarned: serverResult.coins.earned,
          newlyUnlocked: serverResult.newlyUnlocked,
          nextLessonId,
          nextLessonLevel,
        }
      : null

    return (
      <>
        <ResultsView
          pct={pct}
          passed={passed}
          correct={correct}
          total={total}
          drillItems={drillItems}
          answers={answers}
          submitError={submitError}
          coinsEarned={serverResult?.coins.earned ?? 0}
          coinsBreakdown={serverResult?.coins.reasons ?? []}
          newlyPassed={serverResult?.progress.newlyPassed ?? false}
          onRetake={handleRetake}
          lessonHref={lessonHref}
          sectionLessonHref={sectionLessonHref}
        />
        <LessonCompleteModal
          open={showCelebrate}
          onOpenChange={setShowCelebrate}
          summary={summary}
        />
      </>
    )
  }

  // -------------------------------------------------------------------
  // Drill phase
  // -------------------------------------------------------------------
  return (
    <div className="space-y-3">
      <ProgressBar current={step + 1} total={total} />

      {item.kind === "listening" && item.prompt && (
        <ListeningCard prompt={item.prompt} />
      )}

      <div className="rounded-2xl border bg-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Question {step + 1} of {total}
        </p>
        <h2 className="mt-1 text-base font-semibold leading-snug sm:text-lg">
          {question.prompt}
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.choices.map((choice, idx) => {
            const isPicked = picked === idx
            const isAnswered = picked !== null
            const isCorrect = idx === question.correctIndex
            const showCorrect = isAnswered && isCorrect
            const showWrong = isAnswered && isPicked && !isCorrect
            return (
              <button
                key={idx}
                onClick={() => handlePick(idx)}
                disabled={isAnswered}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm font-medium transition-all",
                  !isAnswered &&
                    "hover:-translate-y-px hover:border-foreground/20 hover:bg-accent",
                  showCorrect &&
                    "border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
                  showWrong &&
                    "border-rose-500/60 bg-rose-500/10 text-rose-900 dark:text-rose-100",
                )}
              >
                <span className="flex-1 text-left">{choice}</span>
                {showCorrect && (
                  <Check className="size-4 text-emerald-600" strokeWidth={3} />
                )}
                {showWrong && (
                  <X className="size-4 text-rose-600" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </div>

        {picked !== null && question.explanation && (
          <p
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-xs leading-snug",
              picked === question.correctIndex
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100"
                : "border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-100",
            )}
          >
            {question.explanation}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end">
          <Button
            onClick={handleNext}
            disabled={picked === null || phase === "submitting"}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {step + 1 === total
              ? phase === "submitting"
                ? "Submitting…"
                : "Finish drill"
              : "Next"}
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Listening prompt card
// ---------------------------------------------------------------------

function ListeningCard({ prompt }: { prompt: ListeningPrompt }) {
  const [transcript, setTranscript] = useState(false)
  return (
    <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.08] via-card to-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => speakJapanese(prompt.jp)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-px hover:bg-sky-700"
          >
            <Volume2 className="size-4" strokeWidth={2.25} />
            Play audio
          </button>
          <button
            onClick={() => setTranscript((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-accent"
          >
            {transcript ? (
              <EyeOff className="size-3.5" strokeWidth={2.25} />
            ) : (
              <Eye className="size-3.5" strokeWidth={2.25} />
            )}
            {transcript ? "Hide transcript" : "Show transcript"}
          </button>
        </div>
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 ring-1 ring-inset ring-sky-500/30 dark:text-sky-300">
          Listening
        </span>
      </div>
      {transcript && (
        <div className="mt-3 space-y-1 rounded-lg border border-sky-500/20 bg-card/70 p-3 text-sm">
          <p className="text-foreground">{prompt.jp}</p>
          <p className="text-xs italic text-muted-foreground">{prompt.romaji}</p>
          <p className="text-xs text-muted-foreground">{prompt.english}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round(((current - 1) / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>
          {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------

type DrillItem = {
  kind: "question" | "listening"
  question: DrillQuestion
  prompt: ListeningPrompt | null
}

function ResultsView({
  pct,
  passed,
  correct,
  total,
  drillItems,
  answers,
  submitError,
  coinsEarned,
  coinsBreakdown,
  newlyPassed,
  onRetake,
  lessonHref,
  sectionLessonHref,
}: {
  pct: number
  passed: boolean
  correct: number
  total: number
  drillItems: readonly DrillItem[]
  answers: readonly Answer[]
  submitError: string | null
  coinsEarned: number
  coinsBreakdown: ReadonlyArray<{ reason: string; amount: number }>
  newlyPassed: boolean
  onRetake: () => void
  lessonHref: string
  sectionLessonHref: string
}) {
  return (
    <div className="space-y-3">
      {/* Score card */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border p-5 text-center",
          passed
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-card"
            : "border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-card",
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {passed ? "Section passed" : "Keep going — retake to pass"}
        </p>
        <p
          className={cn(
            "mt-1 text-4xl font-black tabular-nums",
            passed ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300",
          )}
        >
          {pct}%
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {correct} of {total} correct
        </p>

        {coinsEarned > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Coins className="size-3.5" />+{coinsEarned} coins
          </div>
        )}
        {newlyPassed && (
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            First clear — section locked in.
          </p>
        )}
        {submitError && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            Couldn&apos;t save: {submitError}
          </p>
        )}
      </div>

      {/* Coin breakdown */}
      {coinsBreakdown.length > 0 && (
        <ul className="space-y-1 rounded-xl border bg-card p-3 text-xs">
          {coinsBreakdown.map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{b.reason}</span>
              <span className="font-semibold tabular-nums text-amber-600">
                +{b.amount}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Per-question review */}
      <ol className="space-y-2 rounded-2xl border bg-card p-3">
        {answers.map((a, i) => {
          const item = drillItems[i]
          const q = item.question
          const correctText = q.choices[q.correctIndex]
          const pickedText = q.choices[a.pickedIndex] ?? "—"
          return (
            <li
              key={a.questionId}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2.5",
                a.isCorrect
                  ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                  : "border-rose-500/30 bg-rose-500/[0.06]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  a.isCorrect
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/20 text-rose-700 dark:text-rose-300",
                )}
              >
                {a.isCorrect ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  <X className="size-3" strokeWidth={3} />
                )}
              </span>
              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-medium leading-snug">{q.prompt}</p>
                {!a.isCorrect && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    You picked: <span className="font-medium">{pickedText}</span>
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Correct: <span className="font-medium text-foreground">{correctText}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" className="gap-1.5">
          <Link href={lessonHref}>Back to lesson</Link>
        </Button>
        {!passed && (
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={sectionLessonHref}>Re-read lesson</Link>
          </Button>
        )}
        <Button onClick={onRetake} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <RotateCcw className="size-3.5" strokeWidth={2.5} />
          {passed ? "Retake for fun" : "Retake to pass"}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Build drill run (shuffle + cap + zip listening prompts)
// ---------------------------------------------------------------------

function buildDrillRun(
  section: DojoSectionKind,
  questions: readonly DrillQuestion[],
  listening: readonly ListeningPrompt[],
  seed: number,
): DrillItem[] {
  if (section === "listening") {
    // Listening's "questions" are the comprehension Qs already pulled
    // from prompts on the server. Match them back up by id so we can
    // render the audio header.
    const promptById = new Map<string, ListeningPrompt>()
    for (const p of listening) promptById.set(p.question.id, p)
    const items: DrillItem[] = questions.map((q) => ({
      kind: "listening",
      question: q,
      prompt: promptById.get(q.id) ?? null,
    }))
    return takeShuffled(items, PER_ATTEMPT_CAP.listening, seed)
  }
  const items: DrillItem[] = questions.map((q) => ({
    kind: "question",
    question: q,
    prompt: null,
  }))
  return takeShuffled(items, PER_ATTEMPT_CAP[section], seed)
}

function takeShuffled<T>(arr: readonly T[], n: number, seed: number): T[] {
  const copy = [...arr]
  // Fisher–Yates with a deterministic-per-seed PRNG so re-renders
  // within a single attempt don't reshuffle. Each retake bumps `seed`.
  let s = seed * 9301 + 49297
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280
    const j = Math.floor(r * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}
