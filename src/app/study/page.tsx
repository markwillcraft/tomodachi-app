import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brush,
  Flame,
  GraduationCap,
  Keyboard,
  Languages,
  Sparkles,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HIRAGANA, KATAKANA } from "@/lib/kana";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { N5_LESSONS } from "@/lib/grammar";
import { N5_KANJI } from "@/lib/kanji";
import { getStreak } from "@/lib/streak";
import { getKanjiProgress } from "@/lib/kanji-progress";
import { StreakWidget } from "@/components/streak-widget";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudyHubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [wordCount, streak, kanjiProgress] = await Promise.all([
    prisma.word.count({ where: { userId } }),
    getStreak(userId),
    getKanjiProgress(userId),
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

      <StreakWidget {...streak} />

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
          at midnight UTC.
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
