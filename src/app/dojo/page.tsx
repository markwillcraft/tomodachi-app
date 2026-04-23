import Image from "next/image"
import { redirect } from "next/navigation"
import { ArrowRight, Compass, Sparkles } from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { cn } from "@/lib/utils"
import { DOJO_PATHS, getPathTotals } from "@/lib/dojo"
import { getDojoProgressByLesson } from "@/lib/dojo-server"
import { DojoBrowser, type LessonProgressLite } from "./dojo-browser"

// =====================================================================
// /dojo — Guided learning paths (Dachi-sensei's curriculum)
// ---------------------------------------------------------------------
// Counterpart to /study (renamed to "Self-study" in the sidebar).
// Where Self-study lets the learner pick any drill freely, the Dojo
// walks them through a curated curriculum based on Genki I + II.
//
// Phase 1 scope (this page): the Sensei welcome banner + a path
// selector + lesson cards that advertise structure. All lesson
// detail content is `coming-soon`. Phase 2 will route each card
// into its own grammar/vocab/listening drills.
// =====================================================================

export const dynamic = "force-dynamic"

export default async function DojoPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  // Roll up totals across every path so the Sensei header can teach
  // the learner the size of the road map at a glance.
  const totals = DOJO_PATHS.reduce(
    (acc, path) => {
      const t = getPathTotals(path)
      acc.lessons += t.lessons
      acc.grammar += t.grammar
      acc.vocab += t.vocab
      acc.listening += t.listening
      return acc
    },
    { lessons: 0, grammar: 0, vocab: 0, listening: 0 },
  )

  const availablePaths = DOJO_PATHS.filter((p) => p.status === "available")
  const lockedPaths = DOJO_PATHS.length - availablePaths.length

  // Per-lesson progress so cards on the index can render checks /
  // partial-progress dots without each one round-tripping the DB.
  // The server reduces DojoProgress rows into a small lookup keyed
  // by lessonId so the client component stays pure.
  const progressByLesson = await getDojoProgressByLesson(userId)
  const lessonProgress: Record<string, LessonProgressLite> = {}
  let completedLessons = 0
  for (const [lessonId, p] of Object.entries(progressByLesson)) {
    lessonProgress[lessonId] = {
      passedSections: p.passedSections,
      completed: p.completed,
    }
    if (p.completed) completedLessons++
  }

  return (
    // Same vertical rhythm as /shop and /inventory so all three
    // wide-canvas surfaces breathe identically.
    <div className="space-y-3">
      <SenseiHeader
        lessons={totals.lessons}
        completedLessons={completedLessons}
        grammar={totals.grammar}
        vocab={totals.vocab}
        listening={totals.listening}
        availablePaths={availablePaths.length}
        lockedPaths={lockedPaths}
      />

      {/* DojoBrowser pulls DOJO_PATHS itself — Lucide icon refs in
          SECTION_META / PATH_BADGE_META aren't serialisable across
          the server → client boundary, so we don't pass it as a
          prop. (Same pattern as ShopBrowser.) Per-lesson progress
          IS plain data so we thread that through. */}
      <DojoBrowser progressByLesson={lessonProgress} />
    </div>
  )
}

// ---------------------------------------------------------------------
// Sensei header — the welcome banner with Dachi-sensei
// ---------------------------------------------------------------------

function SenseiHeader({
  lessons,
  completedLessons,
  grammar,
  vocab,
  listening,
  availablePaths,
  lockedPaths,
}: {
  lessons: number
  completedLessons: number
  grammar: number
  vocab: number
  listening: number
  availablePaths: number
  lockedPaths: number
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-500/20",
        // Same display-case vocabulary as the shop / inventory
        // headers — 3-stop gradient, corner glow blobs, dot
        // texture, warm halo shadow — but tinted to a calm
        // emerald → sky → violet so the Dojo reads as a
        // "study sanctuary" rather than a storefront.
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
        className="pointer-events-none absolute right-1/3 top-0 size-40 rounded-full bg-violet-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px] text-foreground"
      />

      {/* Soft "tatami sun" — a wider radial sat behind Dachi-sensei
          so he stands in a warm pool of light. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-2 top-2 size-48 rounded-full bg-[radial-gradient(circle,rgba(253,224,71,0.18),transparent_70%)] sm:size-64"
      />

      <div className="relative flex flex-wrap items-stretch gap-x-5 gap-y-4 p-4 sm:gap-x-6 sm:p-5">
        {/* ---- Sensei portrait ---- */}
        <div className="relative flex shrink-0 items-end self-stretch">
          <div className="relative size-28 sm:size-36 lg:size-40">
            {/* Ground shadow under sensei's feet for depth. */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1/2 h-3 w-4/5 -translate-x-1/2 rounded-full bg-foreground/20 blur-md"
            />
            <Image
              src="/Dachi-sensei.png"
              alt="Dachi-sensei, your guide through the dojo"
              fill
              priority
              sizes="(min-width: 1024px) 160px, (min-width: 640px) 144px, 112px"
              className="select-none object-contain drop-shadow-md"
              draggable={false}
            />
            {/* Brand chip — pinned to the sensei the same way the
                store / inventory headers anchor a small medallion to
                their brand mark. */}
            <span
              className={cn(
                "absolute -bottom-1 right-0 inline-flex items-center gap-1 rounded-full border-2 border-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm",
                "bg-gradient-to-br from-emerald-400 to-sky-500 text-white",
              )}
            >
              <Compass className="size-2.5" strokeWidth={3} />
              Sensei
            </span>
          </div>
        </div>

        {/* ---- Speech bubble + meta ---- */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">
              Welcome to the Dojo
            </h1>
            <span className="hidden text-[11px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300/80 sm:inline">
              Guided path · Genki curriculum
            </span>
          </div>

          {/* Speech bubble — a soft card with a tail pointing back
              toward sensei's face. The copy stays short so the page
              load doesn't feel like reading a wall of intro text. */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -left-2 top-1/2 size-3 -translate-y-1/2 rotate-45 border-b border-l bg-card sm:-left-2.5"
            />
            <div className="relative rounded-xl border bg-card/80 px-3 py-2 shadow-sm backdrop-blur-sm sm:px-3.5 sm:py-2.5">
              <p className="text-xs leading-relaxed text-foreground sm:text-[13px]">
                <span className="font-bold tracking-tight">
                  I'm Dachi-sensei.
                </span>{" "}
                Together we'll walk the path of the Japanese language —
                one lesson, one bow at a time. The dojo's gates are
                open, deshi. Pick a stage and we'll start with the
                basics.
              </p>
            </div>
          </div>

          {/* Roll-up stats — surfaces the size of the road map and
              hints at what's locked vs. ready. Same chip family as
              the shop header's live/coming-soon meter. */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
                "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300",
              )}
            >
              <Sparkles className="size-2.5" strokeWidth={3} />
              {availablePaths} path{availablePaths === 1 ? "" : "s"} open
            </span>
            {lockedPaths > 0 && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground tabular-nums">
                  {lockedPaths} coming next
                </span>
              </>
            )}
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground tabular-nums">
              <span
                className={cn(
                  "font-semibold",
                  completedLessons > 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-foreground",
                )}
              >
                {completedLessons}
              </span>
              /{lessons} lessons
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground tabular-nums">
              {grammar} grammar
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground tabular-nums">
              {vocab} vocab
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground tabular-nums">
              {listening} listening
            </span>
          </div>
        </div>

        {/* ---- "Begin training" pointer ----
            Visual nudge toward the path selector below. Not a link
            because the selector isn't a separate route — it's the
            very next section. The arrow keeps the eye moving. */}
        <div className="hidden shrink-0 self-center text-right text-[11px] font-medium text-emerald-700 dark:text-emerald-300/80 sm:block">
          <p className="uppercase tracking-wider">Pick a stage</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground">
            below
            <ArrowRight
              className="size-3 animate-pulse"
              strokeWidth={2.75}
            />
          </p>
        </div>
      </div>
    </section>
  )
}
