import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Brush,
  Crown,
  Flame,
  GraduationCap,
  Keyboard,
  Languages,
  PlayCircle,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HIRAGANA, KATAKANA } from "@/lib/kana";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { N5_LESSONS } from "@/lib/grammar";
import { N5_KANJI } from "@/lib/kanji";
import { getStreak } from "@/lib/streak";
import { getKanjiProgress } from "@/lib/kanji-progress";
import { getDueCount, getMasteryBuckets } from "@/lib/srs";
import { getUserPreferences } from "@/lib/time";
import { StreakWidget } from "@/components/streak-widget";
import { ReviewDueButton } from "@/components/review-due-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudyHubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [wordCount, streak, kanjiProgress, dueCount, mastery, prefs] =
    await Promise.all([
      prisma.word.count({ where: { userId } }),
      getStreak(userId),
      getKanjiProgress(userId),
      getDueCount(userId),
      getMasteryBuckets(userId),
      getUserPreferences(userId),
    ]);

  const kanjiTodayCount = kanjiProgress.viewedToday.size;

  const cards: StudyCard[] = [
    {
      href: "/study/kana",
      icon: Languages,
      title: "Kana table",
      kanji: "あ",
      description:
        "Full hiragana and katakana charts in the gojūon layout. Tap any cell to hear it; hide romaji to self-test.",
      chip: `${HIRAGANA.length + KATAKANA.length} kana`,
      cta: "Open table",
      accent: {
        gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
        chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
        iconWrap:
          "bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-500/30",
        hover:
          "group-hover:border-violet-400/60 group-hover:shadow-violet-500/10",
        kanji: "text-violet-500/10 dark:text-violet-300/10",
      },
    },
    {
      href: "/study/vocab",
      icon: BookOpen,
      title: "Vocab cards",
      kanji: "語",
      description:
        "Flip romaji → kana and meaning. Tap the speaker for native audio. Daily goal: view 50 cards.",
      chip: `${wordCount} ${wordCount === 1 ? "word" : "words"}`,
      cta: "Open vocab",
      accent: {
        gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
        chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
        iconWrap:
          "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
        hover:
          "group-hover:border-amber-400/60 group-hover:shadow-amber-500/10",
        kanji: "text-amber-500/10 dark:text-amber-300/10",
      },
    },
    {
      href: "/study/grammar",
      icon: GraduationCap,
      title: "N5 grammar",
      kanji: "文",
      description:
        "Color-coded particles and copulas. Tap any word to hear it — structure jumps off the page.",
      chip: `${N5_LESSONS.length} lessons`,
      cta: "Open grammar",
      accent: {
        gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
        chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        iconWrap:
          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
        hover:
          "group-hover:border-emerald-400/60 group-hover:shadow-emerald-500/10",
        kanji: "text-emerald-500/10 dark:text-emerald-300/10",
      },
    },
    {
      href: "/study/kanji",
      icon: Brush,
      title: "N5 kanji",
      kanji: "漢",
      description:
        "10 themed sections with animated stroke order and on'yomi / kun'yomi audio.",
      chip: `${kanjiTodayCount}/${N5_KANJI.length} today`,
      cta: "Open kanji",
      accent: {
        gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
        chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
        iconWrap:
          "bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/30",
        hover: "group-hover:border-rose-400/60 group-hover:shadow-rose-500/10",
        kanji: "text-rose-500/10 dark:text-rose-300/10",
      },
    },
    {
      href: "/study/muscle-memory",
      icon: Keyboard,
      title: "Muscle memory",
      kanji: "打",
      description:
        "Type the romaji as kana scroll by. A typing-trainer style drill to wire kana into your fingers.",
      chip: "Typing drill",
      cta: "Start drilling",
      accent: {
        gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
        chip: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
        iconWrap:
          "bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/30",
        hover: "group-hover:border-sky-400/60 group-hover:shadow-sky-500/10",
        kanji: "text-sky-500/10 dark:text-sky-300/10",
      },
    },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-8 select-none text-[10rem] font-bold leading-none text-primary/5 sm:text-[14rem]"
        >
          学
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
              <Sparkles className="size-3.5" />
              Study hub
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Five paths to N5
            </h1>
            <p className="max-w-2xl text-muted-foreground sm:text-lg">
              Start with the kana table, warm up on vocab, then drill grammar
              patterns and kanji stroke order. Every section has native audio
              you can tap.
            </p>
          </div>
          {/* Import lives here (not in the topbar) because it's really a
              "grow your vocab" action — contextual to Study. */}
          <Link
            href="/import"
            className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border bg-background/60 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-background hover:shadow-sm"
          >
            <Upload className="size-3.5" />
            Import words
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <StreakWidget {...streak} autoFreezeStreak={prefs.autoFreezeStreak} />

      {/* Quick actions: surface the highest-value jumps so a returning
          user can re-enter their flow in one tap instead of scanning
          the full card grid. We deliberately put the quiz CTA first —
          that's the *only* thing that levels up SRS items, while every
          card below is "study" (which only marks items as Started). */}
      <QuickActions
        cardsToday={streak.today.cardsViewed}
        quizToday={streak.today.quizAnswered}
        dueCount={dueCount}
      />

      {mastery.tracked > 0 && (
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-500/10 via-background to-background p-5 shadow-sm sm:p-6">
          <div
            aria-hidden
            className="jp pointer-events-none absolute -right-4 -top-8 select-none text-[8rem] font-bold leading-none text-sky-500/5 sm:text-[12rem]"
          >
            復
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 ring-1 ring-inset ring-sky-500/30 dark:text-sky-300">
                <BrainCircuit className="size-5" />
              </span>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-600/80 dark:text-sky-300/80">
                  Spaced review
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {dueCount === 0
                    ? "You're caught up"
                    : `${dueCount} item${dueCount === 1 ? "" : "s"} due for review`}
                </h3>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {dueCount === 0
                    ? "New items unlock as you keep quizzing. Come back after a few quizzes."
                    : "A short review session brings these items forward in your memory. Each correct answer pushes them out further; misses reset the clock."}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <MasteryChip
                    label="Learning"
                    value={mastery.learning}
                    tone="rose"
                  />
                  <MasteryChip
                    label="Reviewing"
                    value={mastery.reviewing}
                    tone="amber"
                  />
                  <MasteryChip
                    label="Familiar"
                    value={mastery.familiar}
                    tone="violet"
                  />
                  <MasteryChip
                    label="Mastered"
                    value={mastery.mastered}
                    tone="emerald"
                  />
                </div>
              </div>
            </div>
            {dueCount > 0 && (
              <ReviewDueButton
                limit={Math.min(dueCount, 20)}
                variant="primary"
                label={`Review ${Math.min(dueCount, 20)} now`}
                className="self-start sm:self-center"
              />
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <StudyHubCard key={c.href} card={c} />
        ))}
      </section>

      <section className="flex items-start gap-3 rounded-xl border bg-gradient-to-r from-orange-500/5 via-muted/30 to-transparent p-5 text-sm text-muted-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
          <Flame className="size-4" />
        </span>
        <div>
          <strong className="text-foreground">How the streak works:</strong> a
          day counts when you both (1) take quizzes totalling at least 50
          questions and (2) view at least 50 vocab cards in Study. Days reset
          at your local midnight. Missed a day? A streak freeze auto-saves it —
          you earn one per week, up to two stored.
        </div>
      </section>
    </div>
  );
}

type StudyCard = {
  href: string;
  icon: LucideIcon;
  title: string;
  kanji: string;
  description: string;
  chip: string;
  cta: string;
  accent: {
    gradient: string;
    chip: string;
    iconWrap: string;
    hover: string;
    kanji: string;
  };
};

function MasteryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "violet" | "emerald";
}) {
  const TONE: Record<typeof tone, string> = {
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    amber:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    violet:
      "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    emerald:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium tabular-nums",
        TONE[tone],
      )}
    >
      {label}
      <span className="opacity-70">·</span>
      <span>{value}</span>
    </span>
  );
}

function StudyHubCard({ card }: { card: StudyCard }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} className="group block">
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
          "group-hover:-translate-y-0.5 group-hover:shadow-lg",
          card.accent.hover,
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br",
            card.accent.gradient,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "jp pointer-events-none absolute -right-3 -bottom-6 select-none text-[7rem] font-bold leading-none transition-transform duration-300 group-hover:scale-105",
            card.accent.kanji,
          )}
        >
          {card.kanji}
        </div>

        <div className="relative flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
                card.accent.iconWrap,
              )}
            >
              <Icon className="size-5" />
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                card.accent.chip,
              )}
            >
              {card.chip}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight">
              {card.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          </div>

          <div className="mt-auto flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            {card.cta}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </article>
    </Link>
  );
}

type QuickAction = {
  href: string;
  icon: LucideIcon;
  label: string;
  // Short scalar shown big — usually a "current vs target" or a count.
  value: string;
  // Tiny caption below the value, e.g. "today" or "due now".
  hint: string;
  // Tailwind classes for the icon chip + accent ring on hover. Kept
  // deliberately small (4 actions only) so we don't end up with a
  // tone soup competing with the study cards below.
  tone: {
    iconWrap: string;
    ring: string;
    glow: string;
  };
};

function QuickActions({
  cardsToday,
  quizToday,
  dueCount,
}: {
  cardsToday: number;
  quizToday: number;
  dueCount: number;
}) {
  const cardGoal = 50;
  const quizGoal = 50;

  const actions: QuickAction[] = [
    {
      // Always route to the quiz hub. The review-due flow needs a
      // client-side fetch + sessionStorage handshake, which the
      // dedicated "Spaced review" section below handles. We surface
      // the due count here just as a teaser so the user knows there's
      // catch-up work waiting.
      href: "/quiz",
      icon: dueCount > 0 ? BrainCircuit : PlayCircle,
      label: "Take a quiz",
      value:
        dueCount > 0
          ? `${dueCount}`
          : `${Math.min(quizToday, quizGoal)}/${quizGoal}`,
      hint: dueCount > 0 ? "due now" : "answers today",
      tone: {
        iconWrap:
          "bg-primary/15 text-primary ring-primary/30 dark:text-primary",
        ring: "group-hover:border-primary/50 group-hover:shadow-primary/10",
        glow: "from-primary/15 via-primary/5 to-transparent",
      },
    },
    {
      href: "/study/vocab",
      icon: BookOpen,
      label: "Daily cards",
      value: `${Math.min(cardsToday, cardGoal)}/${cardGoal}`,
      hint: cardsToday >= cardGoal ? "goal reached" : "viewed today",
      tone: {
        iconWrap:
          "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-300",
        ring: "group-hover:border-amber-400/60 group-hover:shadow-amber-500/10",
        glow: "from-amber-500/15 via-amber-500/5 to-transparent",
      },
    },
    {
      href: "/achievements",
      icon: Crown,
      label: "N5 progress",
      value: "View",
      hint: "mastery breakdown",
      tone: {
        iconWrap:
          "bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-300",
        ring: "group-hover:border-violet-400/60 group-hover:shadow-violet-500/10",
        glow: "from-violet-500/15 via-violet-500/5 to-transparent",
      },
    },
    {
      href: "/progress",
      icon: BarChart3,
      label: "Recent attempts",
      value: "View",
      hint: "history & stats",
      tone: {
        iconWrap:
          "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-300",
        ring: "group-hover:border-emerald-400/60 group-hover:shadow-emerald-500/10",
        glow: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      },
    },
  ];

  return (
    <section aria-label="Quick actions">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Zap className="size-3.5 text-primary" />
        Quick actions
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="group block"
            >
              <div
                className={cn(
                  "relative h-full overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all sm:p-4",
                  "group-hover:-translate-y-0.5 group-hover:shadow-md",
                  a.tone.ring,
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                    a.tone.glow,
                  )}
                />
                <div className="relative flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                      a.tone.iconWrap,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <div className="relative mt-3 min-w-0">
                  <div className="truncate text-sm font-semibold tracking-tight">
                    {a.label}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-base font-bold tabular-nums">
                      {a.value}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {a.hint}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
