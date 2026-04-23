import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight, Compass } from "lucide-react"
import { auth } from "@clerk/nextjs/server"

import {
  DOJO_PATHS,
  type DojoLevel,
  type DojoSectionKind,
} from "@/lib/dojo"
import { getLessonContent } from "@/lib/dojo-content"
import {
  getDojoLessonProgress,
  isSectionDrillable,
} from "@/lib/dojo-server"
import { LessonView } from "./lesson-view"

// =====================================================================
// /dojo/[level]/[lessonId]/[section] — Section LESSON VIEW
// ---------------------------------------------------------------------
// Server entry for the *teaching* surface of a section. Loads the
// lesson's authored content (grammar / vocab / listening) plus the
// user's per-section progress so the view can flag already-passed
// sections (which are allowed to skip the gate).
//
// The actual *drill* lives one level deeper at
// /dojo/[level]/[lessonId]/[section]/drill — the LessonView's "Start
// drill" button is the only intended entry point.
//
// Coming-soon sections (e.g. n5-l4 vocab) hit notFound() — the
// upstream lesson detail page hides their CTAs, so this is just
// belt-and-braces for direct URLs.
// =====================================================================

export const dynamic = "force-dynamic"

const VALID_SECTIONS: readonly DojoSectionKind[] = [
  "grammar",
  "vocab",
  "listening",
]

const SECTION_LABEL: Record<DojoSectionKind, string> = {
  grammar: "Grammar",
  vocab: "Vocab",
  listening: "Listening",
}

type RouteParams = { level: string; lessonId: string; section: string }

export default async function DojoSectionLessonPage({
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

  const content = getLessonContent(lessonId)
  if (!content) notFound()

  const progress = await getDojoLessonProgress(userId, lessonId)
  const sectionProgress = progress.sections[sectionKind]

  const lessonHref = `/dojo/${lesson.level}/${lesson.id}`
  const drillHref = `${lessonHref}/${sectionKind}/drill`

  return (
    <div className="space-y-3">
      <Breadcrumb
        pathLabel={path.label}
        lessonNumber={lesson.number}
        lessonTitle={lesson.title}
        lessonHref={lessonHref}
        sectionLabel={SECTION_LABEL[sectionKind]}
      />

      <LessonView
        section={sectionKind}
        lessonId={lessonId}
        lessonNumber={lesson.number}
        lessonTitle={lesson.title}
        drillHref={drillHref}
        lessonHref={lessonHref}
        intro={content.intro}
        grammar={content.grammar}
        vocab={content.vocab}
        listening={content.listening}
        alreadyPassed={!!sectionProgress?.passedAt}
        bestScorePct={sectionProgress?.bestScorePct ?? null}
      />
    </div>
  )
}

function Breadcrumb({
  pathLabel,
  lessonNumber,
  lessonTitle,
  lessonHref,
  sectionLabel,
}: {
  pathLabel: string
  lessonNumber: number
  lessonTitle: string
  lessonHref: string
  sectionLabel: string
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
      <span className="font-semibold text-foreground">{sectionLabel}</span>
    </nav>
  )
}
