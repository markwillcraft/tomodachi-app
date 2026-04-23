// =====================================================================
// Dojo server-side helpers
// ---------------------------------------------------------------------
// Server-only functions for reading and writing DojoProgress. Anything
// that touches the database lives here (kept out of `dojo.ts` and
// `dojo-content.ts` so those stay safe to import from client bundles).
//
// The contract:
//   * One DojoProgress row per (user, lesson, section).
//   * `bestScorePct` ratchets — a worse retake never lowers it.
//   * `passedAt` is set on the first attempt that hits PASS_THRESHOLD
//     and is never cleared.
//   * `attempts` increments on every submission (pass or fail).
// =====================================================================

import "server-only"

import { prisma } from "@/lib/prisma"
import {
  DOJO_PATHS,
  findLesson,
  findPathForLesson,
  type DojoLevel,
  type DojoPath,
  type DojoSectionKind,
} from "@/lib/dojo"
import { getLessonContent } from "@/lib/dojo-content"

/** Score (out of 100) the user must hit on a single attempt for the
 *  section to count as "passed". Below this they can retake — the
 *  attempt is still logged for streak/coin purposes. */
export const DOJO_PASS_THRESHOLD = 80

export type DojoSectionProgress = {
  lessonId: string
  section: DojoSectionKind
  bestScorePct: number
  attempts: number
  passedAt: Date | null
}

export type DojoLessonProgress = {
  lessonId: string
  /** Number of sections (out of 3) the user has passed. */
  passedSections: number
  /** True iff all three sections have a passedAt. */
  completed: boolean
  sections: Record<DojoSectionKind, DojoSectionProgress | null>
}

const ALL_SECTIONS: readonly DojoSectionKind[] = ["grammar", "vocab", "listening"]

/** Thrown by `submitDojoSection` when the lesson's path has a
 *  `prerequisite` the user hasn't satisfied yet. The API route
 *  catches this specifically and maps it to a 403 so the client can
 *  surface a "finish N5 first" toast instead of a generic 500. */
export class DojoPrereqUnmetError extends Error {
  readonly code = "DOJO_PREREQ_UNMET"
  readonly path: DojoPath
  constructor(message: string, path: DojoPath) {
    super(message)
    this.name = "DojoPrereqUnmetError"
    this.path = path
  }
}

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

/** Load every DojoProgress row a user owns and bucket it by lessonId
 *  so callers can render per-lesson cards in O(1). */
export async function getDojoProgressByLesson(
  userId: string,
): Promise<Record<string, DojoLessonProgress>> {
  const rows = await prisma.dojoProgress.findMany({
    where: { userId },
  })

  const byLesson: Record<string, DojoLessonProgress> = {}
  for (const row of rows) {
    const section = row.section as DojoSectionKind
    if (!ALL_SECTIONS.includes(section)) continue
    const bucket = (byLesson[row.lessonId] ??= emptyLessonProgress(row.lessonId))
    bucket.sections[section] = {
      lessonId: row.lessonId,
      section,
      bestScorePct: row.bestScorePct,
      attempts: row.attempts,
      passedAt: row.passedAt,
    }
  }

  for (const lessonId of Object.keys(byLesson)) {
    const bucket = byLesson[lessonId]
    bucket.passedSections = ALL_SECTIONS.reduce(
      (n, k) => n + (bucket.sections[k]?.passedAt ? 1 : 0),
      0,
    )
    bucket.completed = bucket.passedSections === ALL_SECTIONS.length
  }
  return byLesson
}

/** Single-lesson lookup. Returns an "empty" progress object (zeros,
 *  no passedAt) when the user has never touched the lesson — callers
 *  can render the same UI either way. */
export async function getDojoLessonProgress(
  userId: string,
  lessonId: string,
): Promise<DojoLessonProgress> {
  const rows = await prisma.dojoProgress.findMany({
    where: { userId, lessonId },
  })
  const out = emptyLessonProgress(lessonId)
  for (const row of rows) {
    const section = row.section as DojoSectionKind
    if (!ALL_SECTIONS.includes(section)) continue
    out.sections[section] = {
      lessonId,
      section,
      bestScorePct: row.bestScorePct,
      attempts: row.attempts,
      passedAt: row.passedAt,
    }
  }
  out.passedSections = ALL_SECTIONS.reduce(
    (n, k) => n + (out.sections[k]?.passedAt ? 1 : 0),
    0,
  )
  out.completed = out.passedSections === ALL_SECTIONS.length
  return out
}

/** Per-section dojo progress, bucketed by section kind. Each kind
 *  exposes the set of lesson ids the user has *passed* and the set
 *  they've *attempted* (regardless of pass). The N5 mastery paths use
 *  this to render grammar/listening progress without a second DB hop
 *  per path. */
export type DojoSectionsByKind = Record<
  DojoSectionKind,
  { passed: Set<string>; attempted: Set<string> }
>

export async function getDojoSectionsByKind(
  userId: string,
): Promise<DojoSectionsByKind> {
  const rows = await prisma.dojoProgress.findMany({
    where: { userId },
    select: { lessonId: true, section: true, passedAt: true },
  })
  const out: DojoSectionsByKind = {
    grammar: { passed: new Set(), attempted: new Set() },
    vocab: { passed: new Set(), attempted: new Set() },
    listening: { passed: new Set(), attempted: new Set() },
  }
  for (const row of rows) {
    const section = row.section as DojoSectionKind
    if (!ALL_SECTIONS.includes(section)) continue
    out[section].attempted.add(row.lessonId)
    if (row.passedAt) out[section].passed.add(row.lessonId)
  }
  return out
}

// ---------------------------------------------------------------------
// Prerequisite gates
// ---------------------------------------------------------------------

/** True when the user has satisfied the path's `prerequisite`. Paths
 *  with no prerequisite are always met (so this returns true). The
 *  current rule set has only one prerequisite kind: `level-complete`,
 *  which requires every lesson in the named level to be fully
 *  completed (all three sections passed).
 *
 *  Performance note: a single query fetches every passed-section row
 *  for the user, so calling this once per path on a page render is
 *  cheap (one round-trip total when the helper batches across paths).
 *  For the per-path call site we keep it as a simple helper. */
export async function isPathPrereqMet(
  userId: string,
  path: DojoPath,
): Promise<boolean> {
  if (!path.prerequisite) return true
  if (path.prerequisite.kind === "level-complete") {
    return isLevelComplete(userId, path.prerequisite.level)
  }
  return true
}

/** Returns true iff every lesson in the named level has all three
 *  sections passed. Pulled out of `isPathPrereqMet` so the same logic
 *  can power batch calls (e.g. an "unlocked levels" map for the dojo
 *  page) without re-walking the path tree. */
export async function isLevelComplete(
  userId: string,
  level: DojoLevel,
): Promise<boolean> {
  const path = DOJO_PATHS.find((p) => p.level === level)
  if (!path || path.lessons.length === 0) return false

  const lessonIds = path.lessons.map((l) => l.id)
  const rows = await prisma.dojoProgress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
      passedAt: { not: null },
    },
    select: { lessonId: true, section: true },
  })

  // Bucket passed rows per lesson; the level is "complete" only when
  // every lesson has all three sections in the bucket.
  const passedSectionsByLesson = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!passedSectionsByLesson.has(row.lessonId)) {
      passedSectionsByLesson.set(row.lessonId, new Set())
    }
    passedSectionsByLesson.get(row.lessonId)!.add(row.section)
  }
  for (const id of lessonIds) {
    const passed = passedSectionsByLesson.get(id)
    if (!passed) return false
    if (!ALL_SECTIONS.every((s) => passed.has(s))) return false
  }
  return true
}

/** Convenience: build a map of `{ [level]: prereqMet }` for every
 *  path in the catalog. Cheaper than calling `isPathPrereqMet` once
 *  per path because it short-circuits when no prereq exists. */
export async function getPrereqMetByLevel(
  userId: string,
): Promise<Record<DojoLevel, boolean>> {
  const out = {} as Record<DojoLevel, boolean>
  for (const path of DOJO_PATHS) {
    out[path.level] = await isPathPrereqMet(userId, path)
  }
  return out
}

/** Total count of fully-completed lessons. Used by achievements and
 *  by the N5 mastery dashboard summary. */
export async function getCompletedLessonsCount(userId: string): Promise<number> {
  const rows = await prisma.dojoProgress.findMany({
    where: { userId, passedAt: { not: null } },
    select: { lessonId: true, section: true },
  })
  // Group by lessonId, only count lessons where all 3 sections are passed.
  const byLesson = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!byLesson.has(row.lessonId)) byLesson.set(row.lessonId, new Set())
    byLesson.get(row.lessonId)!.add(row.section)
  }
  let count = 0
  for (const sections of byLesson.values()) {
    if (ALL_SECTIONS.every((s) => sections.has(s))) count++
  }
  return count
}

// ---------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------

export type SubmitSectionInput = {
  userId: string
  lessonId: string
  section: DojoSectionKind
  /** Number correct out of `total`. Caller is responsible for grading
   *  against the canonical drill set so users can't fudge scores by
   *  submitting fake correctIndex values. */
  correct: number
  total: number
}

export type SubmitSectionResult = {
  scorePct: number
  passed: boolean
  /** True only on the *first* attempt that pushed this section over
   *  the threshold. The API uses this to know when to award completion
   *  coins / fire achievement evals. */
  newlyPassed: boolean
  /** True only when this submission completed every section of the
   *  lesson (i.e. the user just finished the lesson). */
  newlyCompletedLesson: boolean
  progress: DojoSectionProgress
}

/** Record an attempt and (optionally) flip the section to passed. The
 *  caller is expected to:
 *    1. Validate that `lessonId` and `section` are known.
 *    2. Have already counted `correct` against the canonical drill bank.
 *    3. Run any coin / achievement / streak side-effects in its own
 *       layer — this function only owns the DojoProgress row. */
export async function submitDojoSection(
  input: SubmitSectionInput,
): Promise<SubmitSectionResult> {
  const { userId, lessonId, section, correct, total } = input

  // Server-side prerequisite guard — the single source of truth for
  // "is this user allowed to submit drills for this lesson?". The
  // RSC redirects + UI gating are user-experience layers; this throw
  // is what prevents a hand-crafted POST from leaking N4 progress
  // before the user has cleared N5. We keep the message specific so
  // the API route can surface it cleanly when caught.
  const path = findPathForLesson(lessonId)
  if (path && path.prerequisite) {
    const met = await isPathPrereqMet(userId, path)
    if (!met) {
      throw new DojoPrereqUnmetError(
        `Path "${path.label}" is locked until prerequisite is met.`,
        path,
      )
    }
  }

  // Defensive: clamp + sanity-check inputs so a malformed POST can't
  // poison the row with negative scores or division-by-zero NaN.
  const safeTotal = Math.max(1, Math.floor(total))
  const safeCorrect = Math.max(0, Math.min(safeTotal, Math.floor(correct)))
  const scorePct = Math.round((safeCorrect / safeTotal) * 100)
  const passedThisAttempt = scorePct >= DOJO_PASS_THRESHOLD

  // Read the current row (if any) so we know whether this is a "new
  // pass" event vs a retake of an already-passed section.
  const existing = await prisma.dojoProgress.findUnique({
    where: {
      userId_lessonId_section: { userId, lessonId, section },
    },
  })

  const wasAlreadyPassed = !!existing?.passedAt
  const newBestScore = Math.max(existing?.bestScorePct ?? 0, scorePct)
  const newAttempts = (existing?.attempts ?? 0) + 1
  const passedAt = existing?.passedAt ?? (passedThisAttempt ? new Date() : null)

  const row = await prisma.dojoProgress.upsert({
    where: {
      userId_lessonId_section: { userId, lessonId, section },
    },
    create: {
      userId,
      lessonId,
      section,
      bestScorePct: scorePct,
      attempts: 1,
      passedAt: passedThisAttempt ? new Date() : null,
    },
    update: {
      bestScorePct: newBestScore,
      attempts: newAttempts,
      passedAt,
    },
  })

  const newlyPassed = !wasAlreadyPassed && !!row.passedAt

  // If this submission flipped the third-and-final section to passed,
  // the user just completed the lesson. We compute that by looking
  // at the OTHER two sections (this row is already up to date).
  let newlyCompletedLesson = false
  if (newlyPassed) {
    const others = await prisma.dojoProgress.findMany({
      where: {
        userId,
        lessonId,
        section: { in: ALL_SECTIONS.filter((s) => s !== section) },
        passedAt: { not: null },
      },
    })
    newlyCompletedLesson = others.length === ALL_SECTIONS.length - 1
  }

  return {
    scorePct,
    passed: !!row.passedAt,
    newlyPassed,
    newlyCompletedLesson,
    progress: {
      lessonId,
      section,
      bestScorePct: row.bestScorePct,
      attempts: row.attempts,
      passedAt: row.passedAt,
    },
  }
}

// ---------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------

/** True when the lesson exists in the catalog AND has authored
 *  content for the requested section. The API uses this to reject
 *  submissions targeting coming-soon lessons. */
export function isSectionDrillable(
  lessonId: string,
  section: DojoSectionKind,
): boolean {
  const lesson = findLesson(lessonId)
  if (!lesson) return false
  const sec = lesson.sections.find((s) => s.kind === section)
  if (!sec || sec.status !== "live") return false
  const content = getLessonContent(lessonId)
  if (!content) return false
  if (section === "grammar") return content.grammar.length > 0
  if (section === "vocab") return content.vocab.length > 0
  return content.listening.length > 0
}

// ---------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------

function emptyLessonProgress(lessonId: string): DojoLessonProgress {
  return {
    lessonId,
    passedSections: 0,
    completed: false,
    sections: {
      grammar: null,
      vocab: null,
      listening: null,
    },
  }
}
