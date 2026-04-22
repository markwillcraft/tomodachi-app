"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Brush, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { N5_KANJI, KANJI_SECTIONS } from "@/lib/kanji";
import { cn } from "@/lib/utils";
import { QuizModeToggle, type QuizSessionMode } from "@/components/quiz-mode-toggle";

const COUNT_OPTIONS = [10, 20, 30, 50];

// Reuse the themed sections from the kanji study lib so the quiz setup
// and the study index stay in sync.
const KANJI_GROUPS: { label: string; chars: string[] }[] = KANJI_SECTIONS.map(
  (s) => ({ label: s.title, chars: s.chars }),
);

export default function KanjiQuizSetupPage() {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [sessionMode, setSessionMode] = useState<QuizSessionMode>("ranked");
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(
    () => new Set(KANJI_GROUPS.map((_, i) => i)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subsetChars = useMemo(() => {
    const out: string[] = [];
    for (const i of selectedGroups) {
      out.push(...KANJI_GROUPS[i].chars);
    }
    return out;
  }, [selectedGroups]);

  function toggle(idx: number) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function start() {
    if (subsetChars.length === 0) {
      setError("Pick at least one group.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sendingAll = subsetChars.length === N5_KANJI.length;
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          mode: "kanji",
          kanjiChars: sendingAll ? undefined : subsetChars,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start quiz");
      sessionStorage.setItem(
        "quiz",
        JSON.stringify({
          mode: "kanji",
          questions: data.questions,
          training: sessionMode === "training",
        }),
      );
      router.push("/quiz/play");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Quiz hub
        </Link>
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Brush className="size-6" />
          <h1 className="text-3xl font-bold tracking-tight">N5 Kanji quiz</h1>
        </div>
        <p className="text-muted-foreground">
          Mixes three question types: kanji → meaning, meaning → kanji, and
          kanji → reading.
        </p>
      </section>

      <QuizModeToggle value={sessionMode} onChange={setSessionMode} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>
                Tap rows to include them. Defaults to the full N5 set.
              </CardDescription>
            </div>
            <Badge variant="secondary">{subsetChars.length} kanji</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelectedGroups(new Set(KANJI_GROUPS.map((_, i) => i)))
              }
            >
              All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedGroups(new Set())}
            >
              None
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KANJI_GROUPS.map((g, i) => {
              const isOn = selectedGroups.has(i);
              return (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isOn
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-card text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  <div className="font-medium">{g.label}</div>
                  <div className="jp mt-1 text-base text-foreground/80">
                    {g.chars.join("")}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How many questions?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={count === n ? "default" : "outline"}
              onClick={() => setCount(n)}
            >
              {n}
            </Button>
          ))}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={start}
          disabled={loading || subsetChars.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Start quiz
              <Badge variant="secondary" className="ml-2">
                {count}
              </Badge>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
