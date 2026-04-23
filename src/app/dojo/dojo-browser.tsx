"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DOJO_PATHS,
  PATH_BADGE_META,
  SECTION_META,
  getPathTotals,
  type DojoLesson,
  type DojoLevel,
  type DojoPath,
} from "@/lib/dojo"

/** Server-derived per-lesson progress summary. Shaped as a plain
 *  object so it serialises cleanly across the server→client edge. */
export type LessonProgressLite = {
  /** 0–3, how many sections of this lesson the user has passed. */
  passedSections: number
  /** True iff all three sections have been passed. */
  completed: boolean
}

// =====================================================================
// DojoBrowser
// ---------------------------------------------------------------------
// Two-part layout that mirrors the Shop's "rail + shelf" feel but
// reorients it for a curriculum:
//   * Top: a horizontal **path selector** with one chip per JLPT
//     level. Locked levels stay visible (so the road map is obvious)
//     but can't be activated.
//   * Below: the **lesson grid** for the active path. Each card is
//     a self-contained snapshot of the lesson — title, theme,
//     summary, highlight grammar points, and a triple section meter
//     (grammar / vocab / listening counts).
//
// Phase 1 ships every section as `coming-soon`, so card actions
// just announce "Coming soon" — no detail route yet. Phase 2 wires
// each section to its drillable surface.
// =====================================================================

export function DojoBrowser({
  progressByLesson = {},
}: {
  progressByLesson?: Record<string, LessonProgressLite>
}) {
  // The first available path is the user's natural starting point.
  // We default to N5 because N4 is locked in Phase 1, but the
  // selector still lets them peek at locked paths.
  const initial: DojoLevel =
    (DOJO_PATHS.find((p) => p.status === "available")?.level as DojoLevel) ??
    "n5"
  const [activeLevel, setActiveLevel] = useState<DojoLevel>(initial)

  const activePath = DOJO_PATHS.find((p) => p.level === activeLevel)

  return (
    <section className="space-y-3">
      <PathSelector
        paths={DOJO_PATHS}
        activeLevel={activeLevel}
        onSelect={setActiveLevel}
        progressByLesson={progressByLesson}
      />

      {activePath && (
        <LessonGrid path={activePath} progressByLesson={progressByLesson} />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------
// Path selector
// ---------------------------------------------------------------------

function PathSelector({
  paths,
  activeLevel,
  onSelect,
  progressByLesson,
}: {
  paths: readonly DojoPath[]
  activeLevel: DojoLevel
  onSelect: (level: DojoLevel) => void
  progressByLesson: Record<string, LessonProgressLite>
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/40 p-2 sm:p-2.5",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
      )}
    >
      {/* Same display-case spotlight as the shop / inventory shelves
          so the dojo feels like a sibling surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.05),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px] text-foreground"
      />

      <ul
        role="tablist"
        aria-label="JLPT path"
        className="relative flex flex-wrap gap-1.5 sm:gap-2"
      >
        {paths.map((path) => {
          const completed = path.lessons.reduce(
            (n, l) => n + (progressByLesson[l.id]?.completed ? 1 : 0),
            0,
          )
          return (
            <li key={path.level} className="min-w-0 flex-1 sm:flex-initial">
              <PathTile
                path={path}
                active={path.level === activeLevel}
                disabled={path.status === "locked"}
                completedLessons={completed}
                onSelect={() => onSelect(path.level)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PathTile({
  path,
  active,
  disabled,
  completedLessons,
  onSelect,
}: {
  path: DojoPath
  active: boolean
  disabled: boolean
  completedLessons: number
  onSelect: () => void
}) {
  const meta = PATH_BADGE_META[path.level]
  const totals = getPathTotals(path)
  const Icon = meta.icon
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect()
      }}
      className={cn(
        "group/tile relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-150 sm:px-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        active && !disabled
          ? "border-foreground/15 bg-card shadow-sm"
          : disabled
            ? "border-dashed border-foreground/10 bg-card/30 opacity-70"
            : "border-transparent hover:border-foreground/10 hover:bg-card/60",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-transform",
          meta.ring,
          meta.tone,
          active && "scale-105",
          disabled && "grayscale",
        )}
      >
        {disabled ? (
          <Lock className="size-4" strokeWidth={2.25} />
        ) : (
          <Icon className="size-4" strokeWidth={2.25} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <p className="truncate text-sm font-bold tracking-tight">
            {path.label}
          </p>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              disabled ? "text-muted-foreground/70" : meta.tone,
            )}
          >
            {disabled ? "Locked" : path.badge}
          </span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {path.textbook}
        </p>
      </div>
      <span className="hidden shrink-0 text-[10px] font-medium text-muted-foreground tabular-nums sm:inline">
        {disabled || completedLessons === 0 ? (
          <>{totals.lessons} lessons</>
        ) : (
          <span
            className={cn(
              "font-semibold",
              active && "text-emerald-700 dark:text-emerald-300",
            )}
          >
            {completedLessons}/{totals.lessons} done
          </span>
        )}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------
// Lesson grid
// ---------------------------------------------------------------------

function LessonGrid({
  path,
  progressByLesson,
}: {
  path: DojoPath
  progressByLesson: Record<string, LessonProgressLite>
}) {
  const totals = getPathTotals(path)
  return (
    <div className="space-y-2">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            {path.label} path
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {path.description}
          </span>
        </div>
        {/* Inline totals — same chip vocabulary as the shop header
            (live/coming soon meter) so the same pattern reappears. */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">
              {totals.grammar}
            </span>{" "}
            grammar
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">
              {totals.vocab}
            </span>{" "}
            vocab
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">
              {totals.listening}
            </span>{" "}
            listening
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {path.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            progress={progressByLesson[lesson.id] ?? null}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Lesson card
// ---------------------------------------------------------------------
//
// Visual hierarchy (top → bottom):
//   1. Number badge + title + theme  ← anchor: "what's this lesson?"
//   2. One-line summary               ← lead: "what will I learn?"
//   3. Highlight subtitle (subtle)    ← preview: "specifically?"
//   4. Inline section meter           ← scope: "how big is it?"
//
// The previous version had the section meter rendered as three boxed
// "mini-cards" inside the parent card. Three nested cards per tile,
// times 12 tiles, equals visual noise — every chip competed with the
// title for attention. The redesign demotes the meter to a single
// inline row of icon + number, which still teaches scope but stops
// shouting. Highlights drop their pill backgrounds for the same
// reason: they become a single comma-separated subtitle.
//
// Whole card is now a Link (or a non-clickable div for locked
// lessons), so the "I can't click the cards" problem is fixed at the
// surface that the user actually wants to interact with.
function LessonCard({
  lesson,
  progress,
}: {
  lesson: DojoLesson
  progress: LessonProgressLite | null
}) {
  const locked = lesson.status === "locked"
  // A lesson is "completed" if either the catalog says so OR the user
  // has passed every section (progress.completed). Catalog status
  // remains the source of truth for "locked" / "available" gating;
  // dynamic progress only ever upgrades the visual state.
  const completed = lesson.status === "completed" || !!progress?.completed
  const href = `/dojo/${lesson.level}/${lesson.id}`

  const inner = (
    <LessonCardInner
      lesson={lesson}
      interactive={!locked}
      progress={progress}
    />
  )

  if (locked) {
    return (
      <div
        aria-disabled
        className={cn(
          "group/card relative flex h-full flex-col gap-2.5 overflow-hidden rounded-xl border border-dashed bg-card/40 p-3.5 opacity-70 sm:p-4",
        )}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={href}
      aria-label={`Open ${lesson.title} lesson`}
      className={cn(
        "group/card relative flex h-full flex-col gap-2.5 overflow-hidden rounded-xl border bg-card/60 p-3.5 transition-all duration-150 sm:p-4",
        "hover:-translate-y-px hover:border-foreground/20 hover:bg-card hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        completed && "border-emerald-500/40 bg-emerald-500/[0.04]",
      )}
    >
      {inner}
    </Link>
  )
}

function LessonCardInner({
  lesson,
  interactive,
  progress,
}: {
  lesson: DojoLesson
  interactive: boolean
  progress: LessonProgressLite | null
}) {
  const locked = lesson.status === "locked"
  const completed = lesson.status === "completed" || !!progress?.completed
  const passedSections = progress?.passedSections ?? 0
  const totalSections = lesson.sections.length
  const inProgress =
    !completed && passedSections > 0 && passedSections < totalSections
  return (
    <>
      {/* Subtle top sheen — same display-case treatment as everywhere
          else in the dojo / shop / inventory triad, but lighter so it
          doesn't fight the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(255,255,255,0.04),transparent_70%)]"
      />

      {/* ---- Header row: number + title block + chevron ----
          Title is the largest element so the eye lands here first.
          The romaji theme sits directly under as a lighter caption —
          dropped uppercase + wider tracking from the previous version
          because shouted-caps Japanese romaji was a major source of
          visual noise. Now it reads as a quiet flavour line. */}
      <div className="relative flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ring-1 ring-inset",
            locked
              ? "bg-muted/40 text-muted-foreground ring-muted-foreground/20"
              : completed
                ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                : "bg-foreground/[0.06] text-foreground ring-foreground/10",
          )}
        >
          {locked ? (
            <Lock className="size-4" strokeWidth={2.25} />
          ) : completed ? (
            <Check className="size-4" strokeWidth={2.5} />
          ) : (
            lesson.number
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight">
            {lesson.title}
          </p>
          <p className="truncate text-[11px] italic text-muted-foreground">
            {lesson.jpTitle}
          </p>
        </div>
        {/* Right-edge affordance — replaces the heavy "SOON →" pill
            with a single chevron that sits quietly and animates on
            hover. The pill text was repeating itself across 12 cards,
            adding a lot of visual repetition without new info. */}
        {interactive && (
          <ArrowRight
            className={cn(
              "mt-1 size-3.5 shrink-0 text-muted-foreground/60",
              "transition-transform duration-150 group-hover/card:translate-x-0.5 group-hover/card:text-foreground",
            )}
            strokeWidth={2.25}
            aria-hidden
          />
        )}
      </div>

      {/* ---- Summary ----
          The lead. Two-line clamp keeps every card the same height. */}
      <p className="relative line-clamp-2 text-xs leading-snug text-foreground/80">
        {lesson.summary}
      </p>

      {/* ---- Highlights as a single dot-separated caption ----
          Was a row of bordered pills with their own backgrounds —
          looked like a UI of its own inside the card. Now it's just
          inline text with a "Covers" prefix and · separators, which
          reads as a natural continuation of the summary. */}
      {lesson.highlights.length > 0 && (
        <p className="relative truncate text-[11px] text-muted-foreground">
          <span className="font-semibold text-muted-foreground/80">
            Covers
          </span>{" "}
          {lesson.highlights.join(" · ")}
        </p>
      )}

      {/* ---- Section meter (inline, demoted) ----
          Three small icon + count pairs on a single line, separated by
          dots. No borders, no backgrounds, no labels, no boxes — the
          icon itself communicates the kind. The meter doubles as a
          progress indicator: completed sections render with a tinted
          background and a corner check, in-progress lessons get a
          "X/3 passed" tail. */}
      <div className="relative mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-foreground/5 pt-2 text-[11px] tabular-nums text-muted-foreground">
        {lesson.sections.map((sec, i) => {
          const meta = SECTION_META[sec.kind]
          const Icon = meta.icon
          return (
            <span
              key={sec.kind}
              className="inline-flex items-center gap-1"
              title={`${sec.count} ${meta.label.toLowerCase()}`}
            >
              <Icon
                className={cn(
                  "size-3.5",
                  locked ? "text-muted-foreground/70" : meta.tone,
                )}
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="font-semibold text-foreground/80">
                {sec.count}
              </span>
              <span className="hidden text-muted-foreground sm:inline">
                {meta.label.toLowerCase()}
              </span>
              {i < lesson.sections.length - 1 && (
                <span aria-hidden className="ml-1 text-muted-foreground/40">
                  ·
                </span>
              )}
            </span>
          )
        })}
        {(completed || inProgress) && (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              completed
                ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300",
            )}
          >
            {completed ? (
              <>
                <Check className="size-2.5" strokeWidth={3} />
                Completed
              </>
            ) : (
              <>
                {passedSections}/{totalSections} passed
              </>
            )}
          </span>
        )}
      </div>
    </>
  )
}
