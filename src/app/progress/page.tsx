"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Loader2, Sparkles } from "lucide-react";
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
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);

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
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!stats) {
    return <p className="text-muted-foreground">No stats available.</p>;
  }

  const { summary, slowestWords, attempts, accuracyByDay } = stats;
  const overall =
    summary.totalAnswered === 0
      ? null
      : Math.round((summary.totalCorrect / summary.totalAnswered) * 100);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold tracking-tight">Progress</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Overall accuracy"
          value={overall === null ? "—" : `${overall}%`}
        />
        <Stat
          label="Questions answered"
          value={summary.totalAnswered.toString()}
        />
        <Stat label="Quizzes taken" value={attempts.length.toString()} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Accuracy over time</CardTitle>
        </CardHeader>
        <CardContent>
          {accuracyByDay.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Take a quiz to see your trend.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyByDay}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 100]}
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Accuracy by mode</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(["vocab", "hiragana", "katakana", "mixed"] as const).map((m) => {
            const v = summary.accuracyByMode[m];
            const pct =
              !v || v.total === 0 ? null : Math.round((v.correct / v.total) * 100);
            return (
              <Card key={m}>
                <CardHeader className="pb-2">
                  <CardDescription className="capitalize">{m}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {pct === null ? "—" : `${pct}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v ? `${v.correct} / ${v.total}` : "no data"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weakest words</CardTitle>
          <CardDescription>
            Words you most need to practice (min. 2 attempts each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.weakestWords.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Need at least 2 attempts per word to surface weak spots.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Romaji</TableHead>
                  <TableHead>Hiragana</TableHead>
                  <TableHead>English</TableHead>
                  <TableHead>Accuracy</TableHead>
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
                      <TableCell>
                        <Badge
                          variant={acc >= 70 ? "secondary" : "destructive"}
                        >
                          {acc}% ({w.correct}/{w.total})
                        </Badge>
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Slowest words
          </CardTitle>
          <CardDescription>
            Words you answer correctly but take the longest on (min. 2 timed
            attempts each). Drill these to build instant recall.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slowestWords.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Take a few timed quizzes to surface your slowest recalls.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Romaji</TableHead>
                  <TableHead>Hiragana</TableHead>
                  <TableHead>English</TableHead>
                  <TableHead>Avg time</TableHead>
                  <TableHead>Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowestWords.map((w) => (
                  <TableRow key={w.romaji}>
                    <TableCell className="font-mono">{w.romaji}</TableCell>
                    <TableCell className="jp">{w.hiragana}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.english}
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.avgMs > 5000 ? "destructive" : "secondary"}>
                        {formatMs(w.avgMs)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.attempts}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              AI study plan
            </CardTitle>
            <CardDescription>
              Personalized tips based on your weakest areas
            </CardDescription>
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
        <CardContent className="space-y-2">
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
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                {t}
              </div>
            ))}
          {!tips && !tipsLoading && summary.totalAnswered === 0 && (
            <p className="text-sm text-muted-foreground">
              Take a quiz first to unlock personalized tips.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No attempts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...attempts]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((a) => {
                    const pct = Math.round((a.correct / a.total) * 100);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          {new Date(a.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">{a.mode}</TableCell>
                        <TableCell>
                          <Badge
                            variant={pct >= 70 ? "success" : "secondary"}
                          >
                            {a.correct} / {a.total} ({pct}%)
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
