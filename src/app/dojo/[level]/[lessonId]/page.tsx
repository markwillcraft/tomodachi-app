import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Compass,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { cn } from "@/lib/utils"
import {
  DOJO_PATHS,
  PATH_BADGE_META,
  SECTION_META,
  type DojoLesson,
  type DojoLevel,
  type DojoSection,
  type DojoSectionKind,
} from "@/lib/dojo"
import {
  DOJO_PASS_THRESHOLD,
  getDojoLessonProgress,
  type DojoSectionProgress,
} from "@/lib/dojo-server"

// =====================================================================
// /dojo/[level]/[lessonId] — Lesson detail
// ---------------------------------------------------------------------
// Mid-tier route between the dojo index and the per-section drill.
// Renders:
//   * Breadcrumb back to /dojo and to the lesson's path
//   * Rich lesson header (title, theme, summary, highlight points)
//   * Three section rows that:
//       - link to /dojo/[level]/[lessonId]/[section] when content is live
//       - render in coming-soon mode otherwise
//       - show a check + best score when the user has passed the section
//   * Prev / next lesson nav
//
// Locked lessons (any N4 lesson while N4 is gated) still navigate
// here so users can preview, but the section rows are non-interactive.
// =====================================================================

export const dynamic = "force-dynamic"

type RouteParams = { level: string; lessonId: string }

export default async function DojoLessonPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { level, lessonId } = await params

  const path = DOJO_PATHS.find((p) => p.level === (level as DojoLevel))
  if (!path) notFound()

  const lesson = path.lessons.find((l) => l.id === lessonId)
  if (!lesson) notFound()

  const lessonIndex = path.lessons.findIndex((l) => l.id === lessonId)
  const prev = lessonIndex > 0 ? path.lessons[lessonIndex - 1] : null
  const next =
    lessonIndex < path.lessons.length - 1
      ? path.lessons[lessonIndex + 1]
      : null
  const pathLocked = path.status === "locked"
  const lessonLocked = lesson.status === "locked"

  const progress = await getDojoLessonProgress(userId, lessonId)

  return (
    <div className="space-y-3">
      <Breadcrumb path={path.label} lessonNumber={lesson.number} />
      <LessonHeader
        lesson={lesson}
        pathLabel={path.label}
        pathTextbook={path.textbook}
        locked={pathLocked || lessonLocked}
        passedSections={progress.passedSections}
      />

      <section className="space-y-2">
        <header className="flex items-baseline justify-between gap-x-3 px-1">
          <h2 className="text-sm font-semibold tracking-tight">
            Lesson sections
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Pass {DOJO_PASS_THRESHOLD}% on each to complete the lesson
          </span>
        </header>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {lesson.sections.map((sec) => (
            <SectionCard
              key={sec.kind}
              section={sec}
              level={lesson.level}
              lessonId={lesson.id}
              locked={pathLocked || lessonLocked}
              progress={progress.sections[sec.kind]}
            />
          ))}
        </div>
      </section>

      <LessonNav level={lesson.level} prev={prev ?? null} next={next ?? null} />
    </div>
  )
}

// ---------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------

function Breadcrumb({
  path,
  lessonNumber,
}: {
  path: string
  lessonNumber: number
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"
    >
      <Link
        href="/dojo"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-card hover:text-foreground"
      >
        <Compass className="size-3" strokeWidth={2.5} aria-hidden />
        Dojo
      </Link>
      <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
      <span className="font-medium">{path}</span>
      <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
      <span className="font-semibold text-foreground tabular-nums">
        Lesson {lessonNumber}
      </span>
    </nav>
  )
}

// ---------------------------------------------------------------------
// Lesson header
// ---------------------------------------------------------------------

function LessonHeader({
  lesson,
  pathLabel,
  pathTextbook,
  locked,
  passedSections,
}: {
  lesson: DojoLesson
  pathLabel: string
  pathTextbook: string
  locked: boolean
  passedSections: number
}) {
  const meta = PATH_BADGE_META[lesson.level]
  const Icon = meta.icon
  const totalSections = lesson.sections.length
  const completed = passedSections === totalSections && totalSections > 0
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-500/20",
        "bg-gradient-to-br from-emerald-500/[0.18] via-sky-500/[0.08] to-violet-500/[0.06]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.06),0_4px_16px_-8px_rgba(16,185,129,0.25)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-emerald-400/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-sky-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px] text-foreground"
      />

      <div className="relative flex flex-wrap items-start gap-x-5 gap-y-3 p-4 sm:p-5">
        {/* Number medallion */}
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl text-xl font-black tabular-nums ring-1 ring-inset",
              completed
                ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                : "bg-card/80 text-foreground ring-foreground/10",
              "shadow-sm",
            )}
          >
            {locked ? (
              <Lock className="size-6" strokeWidth={2.25} />
            ) : completed ? (
              <Check className="size-7" strokeWidth={3} />
            ) : (
              lesson.number
            )}
          </span>
        </div>

        {/* Title block + meta */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {lesson.title}
            </h1>
            <span className="text-xs italic text-muted-foreground">
              {lesson.jpTitle}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wider ring-1 ring-inset",
                meta.ring,
                meta.tone,
              )}
            >
              <Icon className="size-2.5" strokeWidth={3} aria-hidden />
              {pathLabel}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground">{pathTextbook}</span>
            {!locked && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    completed
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-muted-foreground",
                  )}
                >
                  {passedSections}/{totalSections} sections passed
                </span>
              </>
            )}
          </div>

          <p className="max-w-prose text-sm leading-snug text-foreground/85 sm:text-[15px]">
            {lesson.summary}
          </p>

          {lesson.highlights.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                You&apos;ll learn
              </span>
              {lesson.highlights.map((h) => (
                <span
                  key={h}
                  className="rounded-full border bg-card/80 px-2 py-0.5 text-[11px] font-medium"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------

function SectionCard({
  section,
  level,
  lessonId,
  locked,
  progress,
}: {
  section: DojoSection
  level: DojoLevel
  lessonId: string
  locked: boolean
  progress: DojoSectionProgress | null
}) {
  const meta = SECTION_META[section.kind]
  const Icon = meta.icon
  const isLive = section.status === "live" && !locked
  const passed = !!progress?.passedAt
  const hasAttempted = (progress?.attempts ?? 0) > 0
  const href = `/dojo/${level}/${lessonId}/${section.kind}`

  const Wrapper: React.ElementType = isLive ? Link : "div"
  const wrapperProps = isLive ? { href } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group/section relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card/60 p-3.5 transition-all",
        isLive &&
          "hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-card hover:shadow-md",
        passed && "border-emerald-500/40 bg-emerald-500/[0.04]",
        !isLive && "opacity-80",
      )}
    >
      <header className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            passed
              ? "bg-emerald-500/15 ring-emerald-500/30"
              : "bg-foreground/[0.05] ring-foreground/10",
          )}
        >
          <Icon
            className={cn(
              "size-4",
              !isLive && "text-muted-foreground",
              isLive && (passed ? "text-emerald-600 dark:text-emerald-300" : meta.tone),
            )}
            strokeWidth={2.25}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight">{meta.label}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {section.count} item{section.count === 1 ? "" : "s"}
            {progress && progress.attempts > 0 && (
              <>
                <span className="text-muted-foreground/40"> · </span>
                Best {progress.bestScorePct}%
              </>
            )}
          </p>
        </div>
        <SectionStatusPill
          status={section.status}
          locked={locked}
          passed={passed}
        />
      </header>

      {isLive ? (
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {sectionDescription(section.kind)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold transition-colors",
              passed
                ? "text-emerald-600 dark:text-emerald-300"
                : hasAttempted
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-foreground/70 group-hover/section:text-emerald-600",
            )}
          >
            {passed ? (
              <>
                <RotateCcw className="size-3" strokeWidth={2.5} />
                Retake
              </>
            ) : hasAttempted ? (
              <>
                <RotateCcw className="size-3" strokeWidth={2.5} />
                Continue
              </>
            ) : (
              <>
                <Play className="size-3" strokeWidth={2.5} />
                Start
              </>
            )}
          </span>
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {sectionDescription(section.kind)}
        </p>
      )}
    </Wrapper>
  )
}

function SectionStatusPill({
  status,
  locked,
  passed,
}: {
  status: DojoSection["status"]
  locked: boolean
  passed: boolean
}) {
  if (locked) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-muted-foreground/20 bg-muted/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        <Lock className="size-2.5" strokeWidth={2.5} />
        Locked
      </span>
    )
  }
  if (passed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
        <Check className="size-2.5" strokeWidth={3} />
        Passed
      </span>
    )
  }
  if (status === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300">
        <Sparkles className="size-2.5" strokeWidth={2.5} />
        Ready
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-card px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
      <Sparkles className="size-2.5" strokeWidth={2.5} />
      Soon
    </span>
  )
}

function sectionDescription(kind: DojoSectionKind): string {
  switch (kind) {
    case "grammar":
      return "Pattern explanations + drill"
    case "vocab":
      return "Lesson vocab deck + drill"
    case "listening":
      return "Audio prompts + comprehension"
  }
}

// ---------------------------------------------------------------------
// Lesson nav (prev / next + back-to-dojo)
// ---------------------------------------------------------------------

function LessonNav({
  level,
  prev,
  next,
}: {
  level: DojoLevel
  prev: DojoLesson | null
  next: DojoLesson | null
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <Link
        href="/dojo"
        className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-px hover:bg-accent hover:shadow-sm"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2.25} />
        All lessons
      </Link>
      <div className="flex items-center gap-1.5">
        {prev && (
          <Link
            href={`/dojo/${level}/${prev.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-px hover:bg-accent hover:shadow-sm"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.25} />
            <span className="hidden tabular-nums sm:inline">
              {prev.number}.
            </span>{" "}
            <span className="max-w-[10ch] truncate sm:max-w-none">
              {prev.title}
            </span>
          </Link>
        )}
        {next && (
          <Link
            href={`/dojo/${level}/${next.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-px hover:bg-accent hover:shadow-sm"
          >
            <span className="max-w-[10ch] truncate sm:max-w-none">
              {next.title}
            </span>{" "}
            <span className="hidden tabular-nums sm:inline">
              .{next.number}
            </span>
            <ChevronRight className="size-3.5" strokeWidth={2.25} />
          </Link>
        )}
      </div>
    </div>
  )
}
