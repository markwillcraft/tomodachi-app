import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  BookOpen,
  Brush,
  Check,
  Clock,
  Flame,
  History,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MODE_META: Record<
  string,
  { label: string; tone: string; icon: typeof BookOpen }
> = {
  vocab: {
    label: "Vocab",
    tone: "from-amber-500/15 via-background to-background",
    icon: BookOpen,
  },
  hiragana: {
    label: "Hiragana",
    tone: "from-violet-500/15 via-background to-background",
    icon: Type,
  },
  katakana: {
    label: "Katakana",
    tone: "from-emerald-500/15 via-background to-background",
    icon: Type,
  },
  kanji: {
    label: "Kanji",
    tone: "from-rose-500/15 via-background to-background",
    icon: Brush,
  },
  mixed: {
    label: "Mixed",
    tone: "from-sky-500/15 via-background to-background",
    icon: Sparkles,
  },
};

const KIND_LABEL: Record<string, string> = {
  kana_to_romaji: "Japanese → Romaji",
  romaji_to_english: "Romaji → English",
  romaji_to_kana: "Romaji → Hiragana",
  hiragana_char: "Hiragana → Romaji",
  katakana_char: "Katakana → Romaji",
  kanji_to_meaning: "Kanji → Meaning",
  meaning_to_kanji: "Meaning → Kanji",
  kanji_to_reading: "Kanji → Reading",
};

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const attemptId = Number(id);
  if (!Number.isInteger(attemptId) || attemptId <= 0) notFound();

  // Owner check is enforced via the `userId` filter so unauthorized
  // attempt ids 404 instead of leaking the row.
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      results: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          kind: true,
          prompt: true,
          correct: true,
          picked: true,
          isCorrect: true,
          timeMs: true,
        },
      },
    },
  });

  if (!attempt) notFound();

  const meta = MODE_META[attempt.mode] ?? {
    label: attempt.mode,
    tone: "from-muted/40 via-background to-background",
    icon: Flame,
  };
  const Icon = meta.icon;
  const pct =
    attempt.total === 0
      ? 0
      : Math.round((attempt.correct / attempt.total) * 100);

  // Aggregate timing only over rows that actually recorded a duration.
  // Older attempts (pre-timer) will have null timeMs and we don't want
  // them dragging the average to zero.
  const timed = attempt.results.filter(
    (r): r is typeof r & { timeMs: number } => typeof r.timeMs === "number",
  );
  const totalMs = timed.reduce((s, r) => s + r.timeMs, 0);
  const avgMs = timed.length === 0 ? 0 : Math.round(totalMs / timed.length);
  const slowestMs = timed.reduce(
    (max, r) => (r.timeMs > max ? r.timeMs : max),
    0,
  );
  const fastestMs = timed.reduce(
    (min, r) => (r.timeMs < min ? r.timeMs : min),
    Number.POSITIVE_INFINITY,
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/progress"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to progress
        </Link>
      </div>

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-8",
          meta.tone,
        )}
      >
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="size-3.5" />
              Quiz attempt #{attempt.id}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="inline-flex items-center gap-2">
                <Icon className="size-7" />
                {meta.label}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Taken on{" "}
              <strong className="text-foreground">
                {new Date(attempt.createdAt).toLocaleString()}
              </strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <SummaryPill label="Score" value={`${pct}%`} tone={pctTone(pct)} />
            <SummaryPill
              label="Correct"
              value={`${attempt.correct} / ${attempt.total}`}
              tone="border-border bg-card/70"
            />
            {timed.length > 0 && (
              <>
                <SummaryPill
                  label="Avg time"
                  value={formatMs(avgMs)}
                  tone="border-border bg-card/70"
                />
                <SummaryPill
                  label="Total time"
                  value={formatMs(totalMs)}
                  tone="border-border bg-card/70"
                />
              </>
            )}
          </div>
        </div>
      </section>

      {timed.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Fastest answer"
            value={formatMs(fastestMs)}
            tone="emerald"
          />
          <StatCard
            label="Slowest answer"
            value={formatMs(slowestMs)}
            tone="rose"
          />
          <StatCard
            label="Avg per question"
            value={formatMs(avgMs)}
            tone="violet"
          />
          <StatCard
            label="Questions timed"
            value={`${timed.length} / ${attempt.total}`}
            tone="amber"
          />
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Per-question results</CardTitle>
          <CardDescription>
            Every prompt with your pick, the correct answer, and how long
            you spent on it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Kind</th>
                  <th className="px-2 py-2 text-left font-medium">Prompt</th>
                  <th className="px-2 py-2 text-left font-medium">
                    Your answer
                  </th>
                  <th className="px-2 py-2 text-left font-medium">Correct</th>
                  <th className="px-2 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {attempt.results.map((r, i) => {
                  const promptIsJp =
                    r.kind === "kana_to_romaji" ||
                    r.kind === "hiragana_char" ||
                    r.kind === "katakana_char" ||
                    r.kind === "kanji_to_meaning" ||
                    r.kind === "kanji_to_reading";
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 align-top">
                      <td className="px-2 py-3 text-muted-foreground tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant="outline" className="whitespace-nowrap">
                          {KIND_LABEL[r.kind] ?? r.kind}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "break-words",
                            promptIsJp ? "jp text-2xl font-bold" : "font-medium",
                          )}
                        >
                          {r.prompt}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "inline-flex max-w-full items-center gap-1 break-words rounded-md px-2 py-0.5 text-xs font-medium",
                            r.isCorrect
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                          )}
                        >
                          {r.isCorrect ? (
                            <Check className="size-3 shrink-0" />
                          ) : (
                            <X className="size-3 shrink-0" />
                          )}
                          <span className="break-words">{r.picked || "—"}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 text-foreground">
                        <span className="break-words">{r.correct}</span>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">
                        {r.timeMs === null ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <Badge
                            variant={
                              r.timeMs > 5000
                                ? "destructive"
                                : r.timeMs > 2500
                                  ? "secondary"
                                  : "outline"
                            }
                            className="inline-flex items-center gap-1"
                          >
                            <Clock className="size-3" />
                            {formatMs(r.timeMs)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function pctTone(pct: number): string {
  if (pct >= 90)
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (pct >= 70)
    return "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300";
  if (pct >= 50)
    return "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 backdrop-blur-sm",
        tone,
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

const STAT_TONE: Record<
  "emerald" | "rose" | "violet" | "amber",
  { ring: string; text: string }
> = {
  emerald: {
    ring: "ring-emerald-500/30 bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  rose: {
    ring: "ring-rose-500/30 bg-rose-500/5",
    text: "text-rose-700 dark:text-rose-300",
  },
  violet: {
    ring: "ring-violet-500/30 bg-violet-500/5",
    text: "text-violet-700 dark:text-violet-300",
  },
  amber: {
    ring: "ring-amber-500/30 bg-amber-500/5",
    text: "text-amber-700 dark:text-amber-300",
  },
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof STAT_TONE;
}) {
  const t = STAT_TONE[tone];
  return (
    <div
      className={cn(
        "rounded-xl border p-3 ring-1 ring-inset",
        t.ring,
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-xl font-bold tabular-nums", t.text)}>
        {value}
      </div>
    </div>
  );
}
