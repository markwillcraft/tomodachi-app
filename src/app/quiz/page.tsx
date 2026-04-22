import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brush,
  Flame,
  Languages,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { N5_KANJI } from "@/lib/kanji";
import { HIRAGANA, KATAKANA } from "@/lib/kana";
import { cn } from "@/lib/utils";
import { PracticeHistoryCard } from "@/components/practice-history-card";
import { RedoMissedButton } from "@/components/redo-missed-button";

export const dynamic = "force-dynamic";

export default async function QuizHubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [wordCount, attemptCount, lastAttempt, missedCount] = await Promise.all([
    prisma.word.count({ where: { userId } }),
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.quizAttempt.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, mode: true, correct: true, total: true },
    }),
    // Total wrong answers across all attempts — drives whether we surface
    // the "Redo missed" entry point and what number to show on the chip.
    prisma.questionResult.count({
      where: { attempt: { userId }, isCorrect: false },
    }),
  ]);

  const lastPct = lastAttempt
    ? Math.round((lastAttempt.correct / lastAttempt.total) * 100)
    : null;

  const modes: ModeCardProps[] = [
    {
      href: "/quiz/vocab",
      title: "Vocabulary",
      kanji: "語",
      desc: "Drill your imported words. Romaji ↔ kana ↔ English, timed.",
      chip: `${wordCount} ${wordCount === 1 ? "word" : "words"}`,
      icon: BookOpen,
      tone: "amber",
      disabled: wordCount === 0,
      disabledHint: "Import some words first",
    },
    {
      href: "/quiz/kana",
      title: "Hiragana / Katakana",
      kanji: "か",
      desc: "Pick the script (one or both) and choose which rows to drill.",
      chip: `${HIRAGANA.length + KATAKANA.length} kana`,
      icon: Languages,
      tone: "violet",
    },
    {
      href: "/quiz/kanji",
      title: "N5 Kanji",
      kanji: "漢",
      desc: "The full N5 set. Recognize the meaning, the character, or the reading.",
      chip: `${N5_KANJI.length} chars`,
      icon: Brush,
      tone: "rose",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[10rem] font-bold leading-none text-primary/5 sm:text-[14rem]"
        >
          試
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
            <Play className="size-3.5" />
            Quiz hub
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pick what to drill
          </h1>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            Ranked answers count toward your 50/day streak goal. Prefer a
            chill warm-up? Switch to Training on the next screen — no timer,
            no Progress impact.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <QuickStat
              icon={BookOpen}
              label="Your vocab"
              value={wordCount.toString()}
              tone="amber"
            />
            <QuickStat
              icon={TrendingUp}
              label="Quizzes taken"
              value={attemptCount.toString()}
              tone="emerald"
            />
            <QuickStat
              icon={Target}
              label="Last score"
              value={lastPct === null ? "—" : `${lastPct}%`}
              hint={
                lastAttempt
                  ? `${capitalize(lastAttempt.mode)} · ${lastAttempt.correct}/${lastAttempt.total}`
                  : "No attempts yet"
              }
              tone="violet"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Quiz modes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((m) => (
            <ModeCard key={m.href} {...m} />
          ))}
        </div>
      </section>

      {missedCount >= 5 && (
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-500/10 via-background to-background p-5 shadow-sm sm:p-6">
          <div
            aria-hidden
            className="jp pointer-events-none absolute -right-4 -top-8 select-none text-[8rem] font-bold leading-none text-rose-500/5 sm:text-[12rem]"
          >
            復
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 ring-1 ring-inset ring-rose-500/30 dark:text-rose-300">
                <RotateCcw className="size-5" />
              </span>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-600/80 dark:text-rose-300/80">
                  Targeted review
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Drill your missed questions
                </h3>
                <p className="max-w-xl text-sm text-muted-foreground">
                  20 fresh questions built from your most recent wrong
                  answers. Counts toward your streak and earns coins like
                  any other quiz.
                </p>
              </div>
            </div>
            <RedoMissedButton
              limit={20}
              variant="primary"
              label="Start review"
              className="self-start sm:self-center"
            />
          </div>
        </section>
      )}

      <PracticeHistoryCard />

      <section className="flex items-start gap-3 rounded-xl border bg-gradient-to-r from-violet-500/5 via-muted/30 to-transparent p-5 text-sm text-muted-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500 dark:text-violet-300">
          <Sparkles className="size-4" />
        </span>
        <div>
          <strong className="text-foreground">AI tip:</strong> the study coach
          on the{" "}
          <Link
            href="/progress"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Progress page
          </Link>{" "}
          looks at your weakest words across all quiz types and tells you what
          to drill next. Also keep an eye on your{" "}
          <Flame className="inline size-3 text-orange-400" /> streak.
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

type ModeCardProps = {
  href: string;
  title: string;
  kanji: string;
  desc: string;
  chip: string;
  icon: LucideIcon;
  tone: Tone;
  disabled?: boolean;
  disabledHint?: string;
};

function ModeCard(props: ModeCardProps) {
  const Icon = props.icon;
  const tone = TONE[props.tone];

  const inner = (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
        props.disabled
          ? "opacity-60"
          : "group-hover:-translate-y-0.5 group-hover:shadow-lg",
        !props.disabled && tone.hover,
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
        {props.kanji}
      </div>

      <div className="relative flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
              tone.iconWrap,
            )}
          >
            <Icon className="size-5" />
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
              tone.chip,
            )}
          >
            {props.chip}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight">
            {props.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {props.desc}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          {props.disabled ? (
            <span>{props.disabledHint ?? "Unavailable"}</span>
          ) : (
            <>
              <Play className="size-3.5" />
              Start
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </div>
      </div>
    </article>
  );

  if (props.disabled) {
    return (
      <div
        className="group block cursor-not-allowed"
        aria-disabled
        title={props.disabledHint}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={props.href} className="group block">
      {inner}
    </Link>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/70 p-3 backdrop-blur-sm">
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg ring-1 ring-inset",
          t.iconWrap,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-lg font-bold tabular-nums leading-tight">
          {value}
        </div>
        {hint && (
          <div className="truncate text-[11px] text-muted-foreground">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
