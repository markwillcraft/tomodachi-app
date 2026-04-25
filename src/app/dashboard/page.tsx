import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers,
  Library,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getStreak } from "@/lib/streak"
import { getCoinSummary, getDailyQuests } from "@/lib/coins"
import { getUserPreferences } from "@/lib/time"
import { StreakWidget } from "@/components/streak-widget"
import { DailyQuests } from "@/components/daily-quests"
import {
  DashboardGreeting,
  DashboardMetaTime,
} from "@/components/dashboard-time"
import { cn, formatInt } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await currentUser()

  const [
    wordCount,
    recentAttempts,
    quizCount,
    streak,
    quests,
    coinSummary,
    prefs,
  ] = await Promise.all([
    prisma.word.count({ where: { userId } }),
    // Last 10 attempts feed the rolling-accuracy stat. We only need
    // total/correct here; skipping the JSON `questions` blob keeps the
    // payload tiny.
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { total: true, correct: true },
    }),
    // Lifetime count for the "Quizzes taken" stat — Postgres handles
    // this in O(index) so it stays cheap as history grows.
    prisma.quizAttempt.count({ where: { userId } }),
    getStreak(userId),
    getDailyQuests(userId),
    getCoinSummary(userId),
    getUserPreferences(userId),
  ])
  const totalAnswered = recentAttempts.reduce((s, a) => s + a.total, 0)
  const totalCorrect = recentAttempts.reduce((s, a) => s + a.correct, 0)
  const recentAccuracy =
    totalAnswered === 0
      ? null
      : Math.round((totalCorrect / totalAnswered) * 100)

  const firstName =
    user?.firstName ??
    user?.username ??
    user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
    "there"

  const quizzesLabel = formatInt(quizCount)

  // Quest progress drives the hero's adaptive copy + CTA.
  const completedQuests = quests.filter((q) => q.completed).length
  const allQuestsDone = completedQuests === quests.length
  const questPct = Math.round((completedQuests / quests.length) * 100)
  const heroSubtitle = allQuestsDone
    ? `All ${quests.length} daily quests complete · +${coinSummary.earnedToday} coins earned`
    : completedQuests > 0
      ? `${completedQuests} of ${quests.length} quests done · ${questPct}% there`
      : streak.current > 0
        ? `Keep your ${streak.current}-day streak alive`
        : wordCount === 0
          ? "Add some words to begin your journey"
          : "Start today's first quest"

  const heroCta = allQuestsDone
    ? { label: "View progress", href: "/progress" }
    : completedQuests > 0
      ? { label: "Keep going", href: "/study" }
      : wordCount === 0
        ? { label: "Browse categories", href: "/categories" }
        : { label: "Start now", href: "/study" }

  const stats: StatItem[] = [
    {
      label: "Words in your library",
      value: wordCount.toString(),
      icon: Library,
      tone: "violet",
      hint:
        wordCount === 0
          ? "Import some to get started"
          : "From your imports + categories",
    },
    {
      label: "Recent accuracy",
      value: recentAccuracy === null ? "—" : `${recentAccuracy}%`,
      icon: Target,
      tone: "emerald",
      hint:
        recentAccuracy === null ? "Take a quiz to track" : "Last 10 quizzes",
    },
    {
      label: "Quizzes taken",
      value: quizzesLabel,
      icon: TrendingUp,
      tone: "amber",
      hint:
        quizCount === 0
          ? "None yet"
          : quizCount === 1
            ? "All-time · keep going"
            : "All-time attempts",
    },
  ]

  const actions: ActionItem[] = [
    {
      href: "/study",
      title: "Study",
      desc: "Kana table, vocab cards with audio, N5 grammar, and kanji stroke order.",
      icon: BookOpen,
      tone: "violet",
      kanji: "学",
    },
    {
      href: "/categories",
      title: "N5 Categories",
      desc: "Browse curated word lists by topic and add them to your vocab.",
      icon: Layers,
      tone: "amber",
      kanji: "類",
    },
    {
      href: "/quiz",
      title: "Start a quiz",
      desc: "Vocabulary, hiragana, katakana, kanji, or a mixed set.",
      icon: GraduationCap,
      tone: "emerald",
      kanji: "試",
    },
    {
      href: "/progress",
      title: "View progress",
      desc: "Accuracy over time, weakest words, and recent attempts.",
      icon: Sparkles,
      tone: "rose",
      kanji: "道",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Daily Card — structured like a journal entry for today:
          [meta strip] · [mascot + greeting] · [quest tracker + CTA].
          State (amber → emerald) colors the dots and CTA as the day
          progresses, so the card visibly responds to progress. */}
      <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Warm ambient glow anchored to the mascot side. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-1/2 size-56 -translate-y-1/2 rounded-full bg-orange-500/15 blur-3xl"
        />

        {/* Meta strip — simple calendar context. */}
        <div className="relative border-b bg-muted/30 px-5 py-2 text-xs sm:px-6">
          <DashboardMetaTime />
        </div>

        {/* Main — companion on the left, adaptive greeting + concrete state on the right. */}
        <div className="relative flex items-center gap-5 px-5 py-5 sm:gap-6 sm:px-6 sm:py-6">
          <Image
            src="/Dachi-boy.png"
            alt=""
            aria-hidden
            width={240}
            height={240}
            priority
            draggable={false}
            className="size-28 shrink-0 select-none drop-shadow-[0_10px_18px_rgba(251,146,60,0.4)] animate-float sm:size-36"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <DashboardGreeting firstName={firstName} />
            <p className="text-sm text-foreground/70 sm:text-base">
              {heroSubtitle}
            </p>
          </div>
        </div>

        {/* Action strip — segmented quest tracker (one dot per quest) + single adaptive CTA. */}
        <div className="relative flex flex-col gap-3 border-t bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              {quests.map((q) => (
                <span
                  key={q.id}
                  title={q.title}
                  aria-label={`${q.title}${q.completed ? " — done" : ""}`}
                  className={cn(
                    "size-2.5 rounded-full ring-2 ring-offset-0 transition-colors",
                    q.completed
                      ? allQuestsDone
                        ? "bg-emerald-500 ring-emerald-500/25"
                        : "bg-amber-500 ring-amber-500/25"
                      : "bg-transparent ring-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {allQuestsDone
                ? "All daily quests complete"
                : `${completedQuests} of ${quests.length} quests · ${questPct}%`}
            </span>
          </div>
          <Link
            href={heroCta.href}
            className={cn(
              "group inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5",
              allQuestsDone
                ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/30",
            )}
          >
            {heroCta.label}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <StreakWidget {...streak} autoFreezeStreak={prefs.autoFreezeStreak} />

      <DailyQuests
        quests={quests}
        earnedToday={coinSummary.earnedToday}
        resetsAt={coinSummary.resetsAt}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <StatTile key={s.label} stat={s} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Jump back in</h2>
          <Link
            href="/import"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Import words →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((a) => (
            <ActionTile key={a.href} action={a} />
          ))}
        </div>
      </section>
    </div>
  )
}

type Tone = "violet" | "emerald" | "amber" | "rose"

const TONE: Record<
  Tone,
  {
    gradient: string
    iconWrap: string
    chip: string
    hover: string
    kanji: string
  }
> = {
  violet: {
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    iconWrap:
      "bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-500/30",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    hover: "group-hover:border-violet-400/60 group-hover:shadow-violet-500/10",
    kanji: "text-violet-500/10 dark:text-violet-300/10",
  },
  emerald: {
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    iconWrap:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    hover:
      "group-hover:border-emerald-400/60 group-hover:shadow-emerald-500/10",
    kanji: "text-emerald-500/10 dark:text-emerald-300/10",
  },
  amber: {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    iconWrap:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    hover: "group-hover:border-amber-400/60 group-hover:shadow-amber-500/10",
    kanji: "text-amber-500/10 dark:text-amber-300/10",
  },
  rose: {
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
    iconWrap:
      "bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/30",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    hover: "group-hover:border-rose-400/60 group-hover:shadow-rose-500/10",
    kanji: "text-rose-500/10 dark:text-rose-300/10",
  },
}

type StatItem = {
  label: string
  value: string
  icon: LucideIcon
  tone: Tone
  hint?: string
}

function StatTile({ stat }: { stat: StatItem }) {
  const Icon = stat.icon
  const tone = TONE[stat.tone]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm",
      )}
    >
      <div
        aria-hidden
        className={cn("absolute inset-0 bg-gradient-to-br", tone.gradient)}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </div>
          <div className="text-3xl font-bold tabular-nums tracking-tight">
            {stat.value}
          </div>
          {stat.hint && (
            <div className="text-xs text-muted-foreground">{stat.hint}</div>
          )}
        </div>
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
            tone.iconWrap,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}

type ActionItem = {
  href: string
  title: string
  desc: string
  icon: LucideIcon
  tone: Tone
  kanji: string
}

function ActionTile({ action }: { action: ActionItem }) {
  const Icon = action.icon
  const tone = TONE[action.tone]
  return (
    <Link href={action.href} className="group block">
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
          "group-hover:-translate-y-0.5 group-hover:shadow-lg",
          tone.hover,
        )}
      >
        <div
          aria-hidden
          className={cn("absolute inset-0 bg-gradient-to-br", tone.gradient)}
        />
        <div
          aria-hidden
          className={cn(
            "jp pointer-events-none absolute -right-3 -bottom-6 select-none text-[7rem] font-bold leading-none transition-transform duration-300 group-hover:scale-105",
            tone.kanji,
          )}
        >
          {action.kanji}
        </div>
        <div className="relative flex flex-1 flex-col gap-4 p-5">
          <span
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
              tone.iconWrap,
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight">
              {action.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {action.desc}
            </p>
          </div>
          <div className="mt-auto flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Open
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </article>
    </Link>
  )
}
