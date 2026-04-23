"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  BrainCircuit,
  Brush,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  History,
  LineChart as LineChartIcon,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RedoMissedButton } from "@/components/redo-missed-button";
import { ReviewDueButton } from "@/components/review-due-button";

type Stats = {
  summary: {
    totalAnswered: number;
    totalCorrect: number;
    accuracyByMode: Record<string, { correct: number; total: number }>;
    weakestWords: Array<{
      romaji: string;
      hiragana: string;
      english: string;
      correct: number;
      total: number;
    }>;
  };
  slowestWords: Array<{
    romaji: string;
    hiragana: string;
    english: string;
    attempts: number;
    avgMs: number;
  }>;
  attempts: Array<{
    id: number;
    mode: string;
    total: number;
    correct: number;
    createdAt: string;
  }>;
  accuracyByDay: Array<{ day: string; accuracy: number; total: number }>;
  kanjiStats: {
    totalAnswered: number;
    totalCorrect: number;
    byKind: Record<string, { correct: number; total: number }>;
    perChar: Array<{
      char: string;
      meaning: string;
      correct: number;
      total: number;
    }>;
    weakestKanji: Array<{
      char: string;
      meaning: string;
      correct: number;
      total: number;
    }>;
    charsSeen: number;
    charsTotal: number;
  };
  mastery: {
    learning: number;
    reviewing: number;
    familiar: number;
    mastered: number;
    tracked: number;
  };
  dueCount: number;
};

const KANJI_KIND_LABEL: Record<string, string> = {
  kanji_to_meaning: "Kanji → meaning",
  meaning_to_kanji: "Meaning → kanji",
  kanji_to_reading: "Kanji → reading",
};

const MODE_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: Tone }
> = {
  vocab: { label: "Vocab", icon: BookOpen, tone: "amber" },
  hiragana: { label: "Hiragana", icon: Type, tone: "violet" },
  katakana: { label: "Katakana", icon: Type, tone: "emerald" },
  kanji: { label: "Kanji", icon: Brush, tone: "rose" },
  mixed: { label: "Mixed", icon: Sparkles, tone: "sky" },
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const ATTEMPTS_PAGE_SIZE = 10;

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [attemptsPage, setAttemptsPage] = useState(0);

  useEffect(() => {
    fetch("/api/progress/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  async function loadTips() {
    setTipsLoading(true);
    try {
      const res = await fetch("/api/progress/tips", { method: "POST" });
      const data = await res.json();
      setTips(data.tips);
    } finally {
      setTipsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!stats) {
    return <p className="text-muted-foreground">No stats available.</p>;
  }

  const {
    summary,
    slowestWords,
    attempts,
    accuracyByDay,
    kanjiStats,
    mastery,
    dueCount,
  } = stats;
  const kanjiAccuracy =
    kanjiStats.totalAnswered === 0
      ? null
      : Math.round((kanjiStats.totalCorrect / kanjiStats.totalAnswered) * 100);
  const overall =
    summary.totalAnswered === 0
      ? null
      : Math.round((summary.totalCorrect / summary.totalAnswered) * 100);

  const topStats: StatItem[] = [
    {
      label: "Overall accuracy",
      value: overall === null ? "—" : `${overall}%`,
      icon: Target,
      tone: "emerald",
      hint:
        overall === null
          ? "Take a quiz to track"
          : `${summary.totalCorrect} of ${summary.totalAnswered} correct`,
    },
    {
      label: "Questions answered",
      value: summary.totalAnswered.toString(),
      icon: Activity,
      tone: "violet",
      hint: "Across all quiz modes",
    },
    {
      label: "Quizzes taken",
      value: attempts.length.toString(),
      icon: TrendingUp,
      tone: "amber",
      hint:
        attempts.length === 0
          ? "None yet"
          : `Last: ${new Date(
              attempts.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )[0].createdAt,
            ).toLocaleDateString()}`,
    },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[10rem] font-bold leading-none text-primary/5 sm:text-[14rem]"
        >
          道
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
            <TrendingUp className="size-3.5" />
            Your journey
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Progress
          </h1>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            Track your accuracy, find your weakest vocab and kanji, and get
            personalized study tips — all in one place.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {topStats.map((s) => (
          <StatTile key={s.label} stat={s} />
        ))}
      </section>

      {mastery.tracked > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 ring-1 ring-inset ring-sky-500/30 dark:text-sky-300">
                <BrainCircuit className="size-4" />
              </span>
              <div>
                <CardTitle>Mastery progress</CardTitle>
                <CardDescription>
                  Spaced repetition buckets across the {mastery.tracked} item
                  {mastery.tracked === 1 ? "" : "s"} you&apos;ve been quizzed on.
                </CardDescription>
              </div>
            </div>
            {dueCount > 0 && (
              <ReviewDueButton
                limit={Math.min(dueCount, 20)}
                variant="primary"
                label={`Review ${Math.min(dueCount, 20)} due`}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <MasteryBar buckets={mastery} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MasteryTile
                label="Learning"
                value={mastery.learning}
                total={mastery.tracked}
                tone="rose"
                hint="Levels 1–2"
              />
              <MasteryTile
                label="Reviewing"
                value={mastery.reviewing}
                total={mastery.tracked}
                tone="amber"
                hint="Level 3"
              />
              <MasteryTile
                label="Familiar"
                value={mastery.familiar}
                total={mastery.tracked}
                tone="violet"
                hint="Levels 4–5"
              />
              <MasteryTile
                label="Mastered"
                value={mastery.mastered}
                total={mastery.tracked}
                tone="emerald"
                hint="Level 6"
              />
            </div>
            {dueCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                You have <strong className="text-foreground">{dueCount}</strong>{" "}
                items due for review. Clearing the queue pushes them further
                out on the schedule.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Caught up — nothing due right now. New items appear as the
                review intervals elapse.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
              <LineChartIcon className="size-4" />
            </span>
            <div>
              <CardTitle>Accuracy over time</CardTitle>
              <CardDescription>
                Daily average across every quiz mode.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accuracyByDay.length === 0 ? (
            <EmptyState
              icon={LineChartIcon}
              title="No data yet"
              body="Take a quiz to start building your accuracy trend."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={accuracyByDay}
                  margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="accuracyGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 100]}
                    fontSize={12}
                    tickFormatter={(v) => `${v}%`}
                    width={38}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, "Accuracy"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#accuracyGradient)"
                    dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader
          icon={Activity}
          title="Accuracy by mode"
          subtitle="Where your time is going"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["vocab", "hiragana", "katakana", "kanji", "mixed"] as const).map(
            (m) => {
              const v = summary.accuracyByMode[m];
              const pct =
                !v || v.total === 0
                  ? null
                  : Math.round((v.correct / v.total) * 100);
              return (
                <ModeTile
                  key={m}
                  mode={m}
                  pct={pct}
                  correct={v?.correct ?? 0}
                  total={v?.total ?? 0}
                />
              );
            },
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500 ring-1 ring-inset ring-rose-500/30">
                <Target className="size-4" />
              </span>
              <div>
                <CardTitle>Weakest words</CardTitle>
                <CardDescription>Min. 2 attempts each.</CardDescription>
              </div>
            </div>
            {summary.totalAnswered > 0 && (
              <RedoMissedButton limit={20} label="Drill last 20" />
            )}
          </CardHeader>
          <CardContent>
            {summary.weakestWords.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Not enough data"
                body="Need at least 2 attempts per word to surface weak spots."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Romaji</TableHead>
                    <TableHead>Hiragana</TableHead>
                    <TableHead>English</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.weakestWords.map((w) => {
                    const acc = Math.round((w.correct / w.total) * 100);
                    return (
                      <TableRow key={w.romaji}>
                        <TableCell className="font-mono">{w.romaji}</TableCell>
                        <TableCell className="jp">{w.hiragana}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {w.english}
                        </TableCell>
                        <TableCell className="text-right">
                          <AccuracyPill
                            pct={acc}
                            correct={w.correct}
                            total={w.total}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
                <Clock className="size-4" />
              </span>
              <div>
                <CardTitle>Slowest words</CardTitle>
                <CardDescription>
                  Correct answers that took the longest.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {slowestWords.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Nothing timed yet"
                body="Take a few timed quizzes to surface your slowest recalls."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Romaji</TableHead>
                    <TableHead>Hiragana</TableHead>
                    <TableHead className="text-right">Avg time</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowestWords.map((w) => (
                    <TableRow key={w.romaji}>
                      <TableCell className="font-mono">{w.romaji}</TableCell>
                      <TableCell className="jp">{w.hiragana}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={w.avgMs > 5000 ? "destructive" : "secondary"}
                          className="tabular-nums"
                        >
                          {formatMs(w.avgMs)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {w.attempts}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-500/15 via-background to-background p-6">
          <div
            aria-hidden
            className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[8rem] font-bold leading-none text-rose-500/10 sm:text-[12rem]"
          >
            漢
          </div>
          <div className="relative flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-500/80 dark:text-rose-300/80">
              <Brush className="size-3.5" />
              Kanji quiz
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              N5 kanji mastery
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              How your meaning, writing, and reading recall are progressing
              across the 100 N5 characters.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            stat={{
              label: "Kanji accuracy",
              value: kanjiAccuracy === null ? "—" : `${kanjiAccuracy}%`,
              icon: Target,
              tone: "rose",
              hint:
                kanjiAccuracy === null
                  ? "Take a kanji quiz"
                  : `${kanjiStats.totalCorrect} / ${kanjiStats.totalAnswered}`,
            }}
          />
          <StatTile
            stat={{
              label: "Kanji questions",
              value: kanjiStats.totalAnswered.toString(),
              icon: Activity,
              tone: "violet",
              hint: "Across all 3 formats",
            }}
          />
          <StatTile
            stat={{
              label: "Characters seen",
              value: `${kanjiStats.charsSeen} / ${kanjiStats.charsTotal}`,
              icon: Brush,
              tone: "emerald",
              hint: "Unique kanji tested",
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            ["kanji_to_meaning", "meaning_to_kanji", "kanji_to_reading"] as const
          ).map((kind) => {
            const v = kanjiStats.byKind[kind];
            const pct =
              !v || v.total === 0
                ? null
                : Math.round((v.correct / v.total) * 100);
            return (
              <KindTile
                key={kind}
                label={KANJI_KIND_LABEL[kind]}
                pct={pct}
                correct={v?.correct ?? 0}
                total={v?.total ?? 0}
              />
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weakest kanji</CardTitle>
            <CardDescription>
              Kanji you most need to drill (min. 2 attempts each).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kanjiStats.weakestKanji.length === 0 ? (
              <EmptyState
                icon={Brush}
                title="Nothing to drill yet"
                body="Take a kanji quiz to see which characters need work."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kanji</TableHead>
                    <TableHead>Meaning</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kanjiStats.weakestKanji.map((k) => {
                    const acc = Math.round((k.correct / k.total) * 100);
                    return (
                      <TableRow key={k.char}>
                        <TableCell className="jp text-2xl font-bold">
                          {k.char}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {k.meaning}
                        </TableCell>
                        <TableCell className="text-right">
                          <AccuracyPill
                            pct={acc}
                            correct={k.correct}
                            total={k.total}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {kanjiStats.perChar.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All kanji you&apos;ve been tested on</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-3 pt-1">
                <LegendSwatch className="bg-emerald-500/15 border-emerald-500/40">
                  ≥ 70%
                </LegendSwatch>
                <LegendSwatch className="bg-amber-500/15 border-amber-500/40">
                  40–69%
                </LegendSwatch>
                <LegendSwatch className="bg-rose-500/15 border-rose-500/40">
                  &lt; 40%
                </LegendSwatch>
                <LegendSwatch className="bg-muted/40 border-border">
                  &lt; 2 attempts
                </LegendSwatch>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                {kanjiStats.perChar.map((k) => {
                  const acc =
                    k.total === 0 ? 0 : Math.round((k.correct / k.total) * 100);
                  const tone =
                    k.total < 2
                      ? "border-border bg-muted/30 text-muted-foreground"
                      : acc >= 70
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : acc >= 40
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
                  return (
                    <div
                      key={k.char}
                      title={`${k.char} (${k.meaning}) — ${k.correct}/${k.total} = ${acc}%`}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-md border transition-transform hover:scale-105",
                        tone,
                      )}
                    >
                      <span className="jp text-2xl font-bold">{k.char}</span>
                      <span className="mt-0.5 text-[10px] tabular-nums opacity-80">
                        {k.total < 2 ? `${k.total}` : `${acc}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent"
        />
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 ring-1 ring-inset ring-violet-500/30 dark:text-violet-300">
              <Sparkles className="size-5" />
            </span>
            <div>
              <CardTitle>AI study plan</CardTitle>
              <CardDescription>
                Personalized tips based on your weakest areas.
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={loadTips}
            disabled={tipsLoading || summary.totalAnswered === 0}
            size="sm"
          >
            {tipsLoading && <Loader2 className="animate-spin" />}
            {tips ? "Refresh" : "Get tips"}
          </Button>
        </CardHeader>
        <CardContent className="relative space-y-2">
          {tipsLoading && (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-5/6" />
            </>
          )}
          {tips &&
            tips.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm"
              >
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-600 dark:text-violet-300">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{t}</span>
              </div>
            ))}
          {!tips && !tipsLoading && summary.totalAnswered === 0 && (
            <p className="text-sm text-muted-foreground">
              Take a quiz first to unlock personalized tips.
            </p>
          )}
          {!tips && !tipsLoading && summary.totalAnswered > 0 && (
            <p className="text-sm text-muted-foreground">
              Hit <strong>Get tips</strong> to generate a fresh study plan.
            </p>
          )}
        </CardContent>
      </Card>

      <RecentAttemptsCard
        attempts={attempts}
        page={attemptsPage}
        setPage={setAttemptsPage}
      />
    </div>
  );
}

function RecentAttemptsCard({
  attempts,
  page,
  setPage,
}: {
  attempts: Stats["attempts"];
  page: number;
  setPage: (n: number) => void;
}) {
  const sorted = useMemo(
    () =>
      [...attempts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [attempts],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / ATTEMPTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * ATTEMPTS_PAGE_SIZE;
  const slice = sorted.slice(start, start + ATTEMPTS_PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-inset ring-border">
            <History className="size-4" />
          </span>
          <div>
            <CardTitle>Recent attempts</CardTitle>
            <CardDescription>
              {sorted.length === 0
                ? "No quizzes yet."
                : `${sorted.length} quiz${
                    sorted.length === 1 ? "" : "zes"
                  } recorded — click any row to see every answer.`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState
            icon={History}
            title="No attempts yet"
            body="Start your first quiz to see it listed here."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((a) => {
                  const pct = Math.round((a.correct / a.total) * 100);
                  const meta = MODE_META[a.mode];
                  const Icon = meta?.icon ?? Flame;
                  return (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => {
                        window.location.href = `/progress/attempts/${a.id}`;
                      }}
                    >
                      <TableCell className="text-muted-foreground">
                        <Link
                          href={`/progress/attempts/${a.id}`}
                          className="hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {new Date(a.createdAt).toLocaleString()}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon className="size-3.5 text-muted-foreground" />
                          <span className="capitalize">
                            {meta?.label ?? a.mode}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <AccuracyPill
                          pct={pct}
                          correct={a.correct}
                          total={a.total}
                          layout="fraction-first"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <ChevronRight className="ml-auto size-4 opacity-60" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3 text-sm">
                <span className="text-muted-foreground tabular-nums">
                  Showing {start + 1}–
                  {Math.min(start + ATTEMPTS_PAGE_SIZE, sorted.length)} of{" "}
                  {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="hidden sm:inline">Prev</span>
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground tabular-nums">
                    Page {safePage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage(safePage + 1)}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type Tone = "violet" | "emerald" | "amber" | "rose" | "sky";

const TONE: Record<
  Tone,
  {
    gradient: string;
    iconWrap: string;
    bar: string;
  }
> = {
  violet: {
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    iconWrap:
      "bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-500/30",
    bar: "bg-violet-500",
  },
  emerald: {
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    iconWrap:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
    bar: "bg-emerald-500",
  },
  amber: {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    iconWrap:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
    bar: "bg-amber-500",
  },
  rose: {
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
    iconWrap:
      "bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/30",
    bar: "bg-rose-500",
  },
  sky: {
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/30",
    bar: "bg-sky-500",
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
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
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

function ModeTile({
  mode,
  pct,
  correct,
  total,
}: {
  mode: string;
  pct: number | null;
  correct: number;
  total: number;
}) {
  const meta = MODE_META[mode];
  const Icon = meta?.icon ?? Sparkles;
  const tone = TONE[meta?.tone ?? "violet"];
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
      <div
        aria-hidden
        className={cn("absolute inset-0 bg-gradient-to-br", tone.gradient)}
      />
      <div className="relative space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="capitalize">{meta?.label ?? mode}</span>
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {pct === null ? "—" : `${pct}%`}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", tone.bar)}
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {total === 0 ? "no data" : `${correct} / ${total}`}
        </div>
      </div>
    </div>
  );
}

function KindTile({
  label,
  pct,
  correct,
  total,
}: {
  label: string;
  pct: number | null;
  correct: number;
  total: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">
        {pct === null ? "—" : `${pct}%`}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-rose-500 transition-all"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        {total === 0 ? "no data" : `${correct} / ${total}`}
      </div>
    </div>
  );
}

function MasteryBar({
  buckets,
}: {
  buckets: {
    learning: number;
    reviewing: number;
    familiar: number;
    mastered: number;
    tracked: number;
  };
}) {
  const total = Math.max(1, buckets.tracked);
  const segments = [
    { key: "learning", value: buckets.learning, className: "bg-rose-500" },
    { key: "reviewing", value: buckets.reviewing, className: "bg-amber-500" },
    { key: "familiar", value: buckets.familiar, className: "bg-violet-500" },
    { key: "mastered", value: buckets.mastered, className: "bg-emerald-500" },
  ];
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full border bg-muted">
      {segments.map((s) => {
        const pct = (s.value / total) * 100;
        if (pct <= 0) return null;
        return (
          <span
            key={s.key}
            className={cn("h-full transition-all", s.className)}
            style={{ width: `${pct}%` }}
            title={`${s.key}: ${s.value}`}
          />
        );
      })}
    </div>
  );
}

function MasteryTile({
  label,
  value,
  total,
  tone,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  tone: "rose" | "amber" | "violet" | "emerald";
  hint: string;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const TONE: Record<typeof tone, { border: string; text: string; dot: string }> = {
    rose: {
      border: "border-rose-500/30 bg-rose-500/5",
      text: "text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    amber: {
      border: "border-amber-500/30 bg-amber-500/5",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    violet: {
      border: "border-violet-500/30 bg-violet-500/5",
      text: "text-violet-700 dark:text-violet-300",
      dot: "bg-violet-500",
    },
    emerald: {
      border: "border-emerald-500/30 bg-emerald-500/5",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
  };
  const t = TONE[tone];
  return (
    <div className={cn("rounded-xl border p-3", t.border)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className={cn("size-2 rounded-full", t.dot)} />
        {label}
      </div>
      <div className={cn("mt-1.5 text-2xl font-bold tabular-nums", t.text)}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground tabular-nums">
        {hint} · {pct}%
      </div>
    </div>
  );
}

function AccuracyPill({
  pct,
  correct,
  total,
  // "pct-first" (default) renders "72% · 18/25" — percent is primary,
  // fraction secondary. "fraction-first" swaps them for surfaces that
  // emphasize raw counts (e.g. the Recent attempts list). In both
  // layouts we force `whitespace-nowrap` so narrow table columns can
  // never wrap the pill into an awkward two-line oval.
  layout = "pct-first",
}: {
  pct: number;
  correct: number;
  total: number;
  layout?: "pct-first" | "fraction-first";
}) {
  const tone =
    pct >= 70
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : pct >= 40
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
        : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  const pctStr = `${pct}%`;
  const fractionStr = `${correct}/${total}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums leading-none",
        tone,
      )}
      title={`${pctStr} accuracy (${fractionStr})`}
    >
      {layout === "pct-first" ? (
        <>
          <span>{pctStr}</span>
          <span aria-hidden className="opacity-40">
            ·
          </span>
          <span className="text-[10px] font-medium opacity-70">
            {fractionStr}
          </span>
        </>
      ) : (
        <>
          <span>{fractionStr}</span>
          <span aria-hidden className="opacity-40">
            ·
          </span>
          <span className="text-[10px] font-medium opacity-70">{pctStr}</span>
        </>
      )}
    </span>
  );
}

function LegendSwatch({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("inline-block size-3 rounded border", className)} />
      {children}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 py-8 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="text-sm font-medium">{title}</div>
      <p className="max-w-xs text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
