import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers,
  Library,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getStreak } from "@/lib/streak";
import { getCoinSummary, getDailyQuests } from "@/lib/coins";
import { StreakWidget } from "@/components/streak-widget";
import { DailyQuests } from "@/components/daily-quests";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  const [wordCount, recentAttempts, streak, quests, coinSummary] =
    await Promise.all([
      prisma.word.count({ where: { userId } }),
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      getStreak(userId),
      getDailyQuests(userId),
      getCoinSummary(userId),
    ]);
  const totalAnswered = recentAttempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = recentAttempts.reduce((s, a) => s + a.correct, 0);
  const recentAccuracy =
    totalAnswered === 0 ? null : Math.round((totalCorrect / totalAnswered) * 100);

  const firstName =
    user?.firstName ??
    user?.username ??
    user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
    "there";

  const quizzesLabel =
    recentAttempts.length === 10 ? "10+" : recentAttempts.length.toString();

  const stats: StatItem[] = [
    {
      label: "Words in your library",
      value: wordCount.toString(),
      icon: Library,
      tone: "violet",
      hint: wordCount === 0 ? "Import some to get started" : "From your imports + categories",
    },
    {
      label: "Recent accuracy",
      value: recentAccuracy === null ? "—" : `${recentAccuracy}%`,
      icon: Target,
      tone: "emerald",
      hint: recentAccuracy === null ? "Take a quiz to track" : "Last 10 quizzes",
    },
    {
      label: "Quizzes taken",
      value: quizzesLabel,
      icon: TrendingUp,
      tone: "amber",
      hint: recentAttempts.length === 0 ? "None yet" : "Recent activity",
    },
  ];

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
      desc: "Accuracy over time, weakest words, and AI-generated tips.",
      icon: Sparkles,
      tone: "rose",
      kanji: "道",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
        <Image
          src="/tomodachi-logo.svg"
          alt=""
          aria-hidden
          width={573}
          height={320}
          priority
          draggable={false}
          className="pointer-events-none absolute -right-10 -top-12 h-56 w-auto select-none opacity-15 sm:-right-6 sm:-top-16 sm:h-80"
        />
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
            <Sparkles className="size-3.5" />
            Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Hi {firstName}, ready to study?
          </h1>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            Your library, your pace. Build it from N5 categories or your own
            imports — then drill with audio-first flashcards and timed quizzes.
          </p>
        </div>
      </section>

      <StreakWidget {...streak} />

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
  );
}

type Tone = "violet" | "emerald" | "amber" | "rose";

const TONE: Record<
  Tone,
  {
    gradient: string;
    iconWrap: string;
    chip: string;
    hover: string;
    kanji: string;
  }
> = {
  violet: {
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    iconWrap:
      "bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-500/30",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    hover:
      "group-hover:border-violet-400/60 group-hover:shadow-violet-500/10",
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
};

type StatItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
};

function StatTile({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;
  const tone = TONE[stat.tone];
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
  );
}

type ActionItem = {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: Tone;
  kanji: string;
};

function ActionTile({ action }: { action: ActionItem }) {
  const Icon = action.icon;
  const tone = TONE[action.tone];
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
  );
}
