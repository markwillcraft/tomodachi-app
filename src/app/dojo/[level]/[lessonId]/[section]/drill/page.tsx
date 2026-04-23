import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight, Compass } from "lucide-react"
import { auth } from "@clerk/nextjs/server"

import {
  DOJO_PATHS,
  SECTION_META,
  type DojoLevel,
  type DojoSectionKind,
} from "@/lib/dojo"
import {
  getListeningPrompts,
  getSectionDrills,
} from "@/lib/dojo-content"
import {
  DOJO_PASS_THRESHOLD,
  getDojoLessonProgress,
  isSectionDrillable,
} from "@/lib/dojo-server"
import { DrillRunner } from "../drill-runner"

// =====================================================================
// /dojo/[level]/[lessonId]/[section]/drill — Section drill
// ---------------------------------------------------------------------
// Dedicated drill route. The lesson view at the parent route is the
// only intended entry point — its "Start drill" button links here.
// Direct URL navigation also works (we don't gate the drill itself
// because the lesson view is the gate, not a hard auth boundary).
// =====================================================================

export const dynamic = "force-dynamic"

const VALID_SECTIONS: readonly DojoSectionKind[] = [
  "grammar",
  "vocab",
  "listening",
]

type RouteParams = { level: string; lessonId: string; section: string }

export default async function DojoSectionDrillPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { level, lessonId, section } = await params

  const path = DOJO_PATHS.find((p) => p.level === (level as DojoLevel))
  if (!path) notFound()
  const lesson = path.lessons.find((l) => l.id === lessonId)
  if (!lesson) notFound()
  if (!VALID_SECTIONS.includes(section as DojoSectionKind)) notFound()
  const sectionKind = section as DojoSectionKind

  if (!isSectionDrillable(lessonId, sectionKind)) notFound()

  const questions = getSectionDrills(lessonId, sectionKind)
  const listening =
    sectionKind === "listening" ? getListeningPrompts(lessonId) : []

  const progress = await getDojoLessonProgress(userId, lessonId)
  const sectionProgress = progress.sections[sectionKind]

  const meta = SECTION_META[sectionKind]
  const SectionIcon = meta.icon

  const lessonIndex = path.lessons.findIndex((l) => l.id === lessonId)
  const nextLesson =
    lessonIndex < path.lessons.length - 1
      ? path.lessons[lessonIndex + 1]
      : null

  const lessonHref = `/dojo/${lesson.level}/${lesson.id}`
  const sectionHref = `${lessonHref}/${sectionKind}`

  return (
    <div className="space-y-3">
      <Breadcrumb
        pathLabel={path.label}
        lessonNumber={lesson.number}
        lessonTitle={lesson.title}
        lessonHref={lessonHref}
        sectionLabel={meta.label}
        sectionHref={sectionHref}
      />

      <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.05] ring-1 ring-inset ring-foreground/10">
            <SectionIcon className={`size-5 ${meta.tone}`} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Lesson {lesson.number} · {meta.label} drill
            </p>
            <h1 className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
              {lesson.title}{" "}
              <span className="text-xs font-normal italic text-muted-foreground">
                {lesson.jpTitle}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <Stat label="Pass" value={`${DOJO_PASS_THRESHOLD}%`} />
          {sectionProgress && (
            <Stat
              label="Best"
              value={`${sectionProgress.bestScorePct}%`}
              accent={sectionProgress.passedAt ? "text-emerald-600" : undefined}
            />
          )}
          {sectionProgress && (
            <Stat
              label="Tries"
              value={String(sectionProgress.attempts)}
            />
          )}
        </div>
      </header>

      <DrillRunner
        lessonId={lessonId}
        lessonTitle={lesson.title}
        lessonNumber={lesson.number}
        lessonJpTitle={lesson.jpTitle}
        section={sectionKind}
        questions={questions}
        listening={listening}
        passThreshold={DOJO_PASS_THRESHOLD}
        nextLessonId={nextLesson?.id ?? null}
        nextLessonLevel={(nextLesson?.level as DojoLevel | undefined) ?? null}
        existingPassedAt={
          sectionProgress?.passedAt
            ? sectionProgress.passedAt.toISOString()
            : null
        }
        lessonHref={lessonHref}
        sectionLessonHref={sectionHref}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  )
}

function Breadcrumb({
  pathLabel,
  lessonNumber,
  lessonTitle,
  lessonHref,
  sectionLabel,
  sectionHref,
}: {
  pathLabel: string
  lessonNumber: number
  lessonTitle: string
  lessonHref: string
  sectionLabel: string
  sectionHref: string
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
      <span className="font-medium">{pathLabel}</span>
      <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
      <Link
        href={lessonHref}
        className="rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-card hover:text-foreground"
      >
        Lesson {lessonNumber} · {lessonTitle}
      </Link>
      <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
      <Link
        href={sectionHref}
        className="rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-card hover:text-foreground"
      >
        {sectionLabel}
      </Link>
      <ChevronRight className="size-3 text-muted-foreground/50" aria-hidden />
      <span className="font-semibold text-foreground">Drill</span>
    </nav>
  )
}
