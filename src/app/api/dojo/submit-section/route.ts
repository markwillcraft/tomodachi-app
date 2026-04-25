import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/auth-utils"
import { awardForQuiz, awardForDojoMilestones } from "@/lib/coins"
import { evaluateAchievements } from "@/lib/achievements"
import {
  DojoPrereqUnmetError,
  isPathPrereqMet,
  isSectionDrillable,
  submitDojoSection,
} from "@/lib/dojo-server"
import {
  getSectionDrills,
  getLessonContent,
  type DrillQuestion,
} from "@/lib/dojo-content"
import { findPathForLesson, type DojoSectionKind } from "@/lib/dojo"
import { enforceRateLimit } from "@/lib/rate-limit"
import {
  notifyAchievementUnlocked,
  notifyDojoLessonCompleted,
  notifyQuestCompleted,
  notifyQuizFinished,
  type NotificationRow,
} from "@/lib/notify"
import { getUserTimezone, localDayKey } from "@/lib/time"

export const runtime = "nodejs"

// Submission payload from the drill client. We deliberately don't
// trust the client's `isCorrect` flag — the server re-grades each
// answer against the canonical drill bank in `dojo-content.ts`. The
// client just tells us *which* questions were asked (by id) and
// *which* choice the user picked.
type SubmittedAnswer = {
  questionId: string
  pickedIndex: number
  timeMs?: number | null
}

type Body = {
  lessonId?: string
  section?: DojoSectionKind
  answers?: SubmittedAnswer[]
}

const VALID_SECTIONS: readonly DojoSectionKind[] = [
  "grammar",
  "vocab",
  "listening",
]

export async function POST(req: Request) {
  const userId = await requireUserId()
  if (userId instanceof NextResponse) return userId

  // Same `write` bucket as quiz/submit — dojo submissions are
  // structurally identical (QuizAttempt + N QuestionResults + coin
  // awards + achievement eval).
  const limited = await enforceRateLimit("write", userId)
  if (limited) return limited

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { lessonId, section, answers } = body

  if (!lessonId || typeof lessonId !== "string") {
    return NextResponse.json({ error: "Missing lessonId" }, { status: 400 })
  }
  if (!section || !VALID_SECTIONS.includes(section)) {
    return NextResponse.json(
      { error: "section must be grammar | vocab | listening" },
      { status: 400 },
    )
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "Missing answers" }, { status: 400 })
  }
  if (!isSectionDrillable(lessonId, section)) {
    return NextResponse.json(
      { error: "Section is not drillable yet (coming soon)" },
      { status: 400 },
    )
  }

  // Up-front prerequisite check. `submitDojoSection` enforces this
  // too (it's the canonical guard), but doing it before we write the
  // QuizAttempt prevents orphan rows when a hand-crafted POST hits
  // a locked path.
  const path = findPathForLesson(lessonId)
  if (path?.prerequisite && !(await isPathPrereqMet(userId, path))) {
    return NextResponse.json(
      {
        error: "Prerequisite not met for this lesson's path.",
        code: "DOJO_PREREQ_UNMET",
        path: { level: path.level, label: path.label },
      },
      { status: 403 },
    )
  }

  // Pull the canonical drill bank and index it so we can grade and
  // also rebuild the QuestionResult rows (prompt/correct text) without
  // trusting the client.
  const bank = getSectionDrills(lessonId, section)
  if (bank.length === 0) {
    return NextResponse.json(
      { error: "No drills available for this section" },
      { status: 500 },
    )
  }
  const byId = new Map<string, DrillQuestion>()
  for (const q of bank) byId.set(q.id, q)

  // Re-grade. Anything referencing an unknown question id is dropped
  // on the floor (could be a stale client cache from a content update).
  type Graded = {
    question: DrillQuestion
    pickedIndex: number
    isCorrect: boolean
    timeMs: number | null
  }
  const graded: Graded[] = []
  for (const a of answers) {
    const q = a.questionId ? byId.get(a.questionId) : undefined
    if (!q) continue
    const pickedIndex =
      typeof a.pickedIndex === "number" &&
      a.pickedIndex >= 0 &&
      a.pickedIndex < q.choices.length
        ? a.pickedIndex
        : -1
    graded.push({
      question: q,
      pickedIndex,
      isCorrect: pickedIndex === q.correctIndex,
      timeMs:
        typeof a.timeMs === "number" && a.timeMs >= 0
          ? Math.round(a.timeMs)
          : null,
    })
  }
  if (graded.length === 0) {
    return NextResponse.json(
      { error: "No valid answers in submission" },
      { status: 400 },
    )
  }

  const total = graded.length
  const correct = graded.filter((g) => g.isCorrect).length

  // Log a QuizAttempt so dojo activity automatically counts toward the
  // daily quests, the streak, and analytics. Mode tags it so we can
  // filter dojo vs free-roam quizzes later.
  const mode = `dojo_${section}`
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      mode,
      total,
      correct,
      results: {
        create: graded.map((g) => ({
          // Dojo questions don't reference the user's vocab table.
          wordId: null,
          kind: `dojo_${section}`,
          prompt: g.question.prompt,
          correct:
            g.question.choices[g.question.correctIndex] ?? "",
          picked:
            g.pickedIndex >= 0 ? g.question.choices[g.pickedIndex] : "",
          isCorrect: g.isCorrect,
          timeMs: g.timeMs,
        })),
      },
    },
  })

  // Update DojoProgress (best score / passedAt). This is what flips
  // the lesson card from "in progress" to "passed" and unlocks the
  // lesson-complete modal once all three sections are green.
  //
  // `submitDojoSection` is the single gate for path prerequisites
  // (e.g. N4 requires full N5 completion). When that gate trips we
  // surface a 403 with a stable error code so the client can render
  // a "finish N5 first" message instead of a generic failure toast.
  let sectionResult: Awaited<ReturnType<typeof submitDojoSection>>
  try {
    sectionResult = await submitDojoSection({
      userId,
      lessonId,
      section,
      correct,
      total,
    })
  } catch (err) {
    if (err instanceof DojoPrereqUnmetError) {
      return NextResponse.json(
        {
          error: "Prerequisite not met for this lesson's path.",
          code: err.code,
          path: { level: err.path.level, label: err.path.label },
        },
        { status: 403 },
      )
    }
    throw err
  }

  // Award coins. Two streams:
  //   1. The standard quiz coins (base + per-correct + accuracy bonus
  //      + any newly-completed daily quests) — same calc as a regular
  //      quiz, dedup'd on attemptId.
  //   2. Dojo milestones — first-pass bonus and lesson-completion
  //      bonus, dedup'd so retakes never double-pay.
  const quizCoins = await awardForQuiz(userId, attempt.id, total, correct)
  const milestoneCoins = await awardForDojoMilestones(
    userId,
    lessonId,
    section,
    sectionResult.newlyPassed,
    sectionResult.newlyCompletedLesson,
  )

  // Re-evaluate achievements. The `dojoLessonsCompleted` counter is
  // computed from DojoProgress on the next eval pass, so a freshly
  // completed lesson can unlock its tier here.
  const newlyUnlocked = await evaluateAchievements(userId)

  // Grab the lesson title once so the client modal doesn't need a
  // second round trip to render its hero copy.
  const lesson = getLessonContent(lessonId)

  // Fan out in-app notifications. Section-level passes don't get
  // their own bell entry (would be 3 per lesson); we surface the
  // attempt as a generic "quiz finished" plus the lesson-completion
  // celebration when all three sections are now passed. The freshly
  // created rows are echoed back so the client pops a toast for each.
  let newNotifications: NotificationRow[] = []
  try {
    const tz = await getUserTimezone(userId)
    const day = localDayKey(new Date(), tz)
    const tasks: Array<Promise<NotificationRow | null>> = [
      notifyQuizFinished(userId, attempt.id, { mode, total, correct }),
    ]
    if (sectionResult.newlyCompletedLesson) {
      tasks.push(
        notifyDojoLessonCompleted(userId, {
          lessonId,
          lessonTitle:
            lesson?.intro?.split(/[.\n]/)[0]?.slice(0, 80) ??
            `Lesson ${lessonId}`,
          level: path?.level ?? "n5",
        }),
      )
    }
    for (const a of newlyUnlocked) {
      tasks.push(
        notifyAchievementUnlocked(userId, {
          achievementId: a.id,
          title: a.title,
          icon: a.icon,
        }),
      )
    }
    for (const q of quizCoins.claimedQuests) {
      tasks.push(
        notifyQuestCompleted(userId, day, {
          questId: q.id,
          title: q.title,
          reward: q.reward,
        }),
      )
    }
    const results = await Promise.all(tasks)
    newNotifications = results.filter(
      (r): r is NotificationRow => r !== null,
    )
  } catch {
    // Non-blocking.
  }

  return NextResponse.json({
    attemptId: attempt.id,
    score: {
      total,
      correct,
      pct: sectionResult.scorePct,
      passed: sectionResult.passed,
      passThreshold: 80,
    },
    progress: {
      bestScorePct: sectionResult.progress.bestScorePct,
      attempts: sectionResult.progress.attempts,
      passedAt: sectionResult.progress.passedAt?.toISOString() ?? null,
      newlyPassed: sectionResult.newlyPassed,
      newlyCompletedLesson: sectionResult.newlyCompletedLesson,
    },
    coins: {
      earned: quizCoins.earned + milestoneCoins.earned,
      reasons: [...quizCoins.reasons, ...milestoneCoins.reasons],
    },
    newlyUnlocked,
    newNotifications,
    lesson: lesson
      ? { id: lesson.lessonId, intro: lesson.intro }
      : null,
  })
}
