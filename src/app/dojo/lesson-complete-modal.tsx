"use client"

// =====================================================================
// LessonCompleteModal
// ---------------------------------------------------------------------
// Celebratory modal that pops the moment a user finishes the third
// section of a lesson (i.e. `newlyCompletedLesson` flips true on a
// /api/dojo/submit-section response). It's deliberately *only* shown
// for whole-lesson completions — section-only passes get an inline
// banner on the drill results screen so the modal stays a "moment".
//
// Renders:
//   * Dachi-sensei portrait + congratulatory line
//   * Lesson number + title (rendered like a diploma stamp)
//   * Coin total earned in this submission
//   * Up to 3 newly-unlocked achievements
//   * Two CTAs: "Back to Dojo" and "Next lesson →" when there is one
// =====================================================================

import Image from "next/image"
import Link from "next/link"
import { Award, Coins, Sparkles } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type LessonCompleteSummary = {
  lessonId: string
  lessonNumber: number
  lessonTitle: string
  /** Romaji / Japanese theme line — surfaced as a subtitle. */
  jpTitle: string
  /** Total coins earned across the *final* submission (quiz coins +
   *  milestone bonuses + any quest claims). */
  coinsEarned: number
  /** Achievements that unlocked on this submission (may be empty). */
  newlyUnlocked: ReadonlyArray<{ id: string; title: string }>
  /** Lesson id of the next available lesson, if one exists. */
  nextLessonId: string | null
  /** Level of the next lesson — needed to build its href. */
  nextLessonLevel: "n5" | "n4" | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: LessonCompleteSummary | null
}

export function LessonCompleteModal({ open, onOpenChange, summary }: Props) {
  if (!summary) return null

  const nextHref =
    summary.nextLessonId && summary.nextLessonLevel
      ? `/dojo/${summary.nextLessonLevel}/${summary.nextLessonId}`
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-emerald-500/40 bg-gradient-to-b from-emerald-50 via-white to-sky-50 p-0 dark:from-emerald-950/40 dark:via-zinc-950 dark:to-sky-950/40">
        {/* Top — sensei + headline */}
        <div className="relative flex flex-col items-center px-6 pb-4 pt-6 text-center">
          <SparkleField />
          <div className="relative mb-3 size-24 overflow-hidden rounded-full ring-4 ring-emerald-400/30 dark:ring-emerald-300/30">
            <Image
              src="/Dachi-sensei.png"
              alt="Dachi-sensei"
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>
          <DialogTitle className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
            Lesson complete!
          </DialogTitle>
          <p className="mt-1 max-w-[28ch] text-sm text-zinc-600 dark:text-zinc-300">
            Yatta! You finished{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              Lesson {summary.lessonNumber} — {summary.lessonTitle}
            </span>
            .
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-400">
            {summary.jpTitle}
          </p>
        </div>

        {/* Coin + achievement strip */}
        <div className="mx-6 mb-4 rounded-xl border border-emerald-500/30 bg-white/70 p-3 dark:border-emerald-400/30 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              +{summary.coinsEarned} coins
            </span>
            <span className="text-xs text-zinc-500">
              earned this lesson
            </span>
          </div>

          {summary.newlyUnlocked.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              {summary.newlyUnlocked.slice(0, 3).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200"
                >
                  <Award className="size-3.5 text-violet-500" />
                  <span className="font-medium">Achievement unlocked:</span>
                  <span>{a.title}</span>
                </li>
              ))}
              {summary.newlyUnlocked.length > 3 && (
                <li className="pl-5 text-[11px] text-zinc-500">
                  + {summary.newlyUnlocked.length - 3} more
                </li>
              )}
            </ul>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-2 border-t border-zinc-200 bg-white/60 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <Button
            asChild
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <Link href="/dojo">Back to Dojo</Link>
          </Button>
          {nextHref && (
            <Button
              asChild
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onOpenChange(false)}
            >
              <Link href={nextHref}>Next lesson →</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Decorative sparkles behind the sensei portrait. Pure CSS, no libs.
function SparkleField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-start justify-center pt-2 opacity-70"
    >
      <Sparkles className="size-5 -translate-x-12 translate-y-2 text-amber-400" />
      <Sparkles className="size-3 translate-x-8 -translate-y-1 text-emerald-400" />
      <Sparkles className="size-4 translate-x-14 translate-y-6 text-sky-400" />
    </div>
  )
}
