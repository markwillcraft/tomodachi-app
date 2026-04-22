"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Dumbbell,
  History,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/feedback";
import { addPracticeSession } from "@/lib/practice-history";

type Question = {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  kind: string;
  wordId?: number;
};

type Answer = {
  question: Question;
  pickedIndex: number;
  isCorrect: boolean;
  timeMs: number;
};

const LETTERS = ["A", "B", "C", "D"];

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function PlayPage() {
  const [mode, setMode] = useState<string>("vocab");
  const [training, setTraining] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [finished, setFinished] = useState(false);
  const [tips, setTips] = useState<string[] | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);

  // Per-question timer. We capture the timestamp the question rendered and
  // diff against the moment the user picks an answer. In training mode we
  // still capture the start time (so we can compute a session duration on
  // the results screen) but never display it mid-quiz.
  const questionStartRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("quiz");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      mode: string;
      questions: Question[];
      training?: boolean;
    };
    setMode(parsed.mode);
    setQuestions(parsed.questions);
    setTraining(Boolean(parsed.training));
    sessionStartRef.current = Date.now();
  }, []);

  // Reset timer whenever a new question shows up. Skip the per-question
  // ticker entirely in training mode — there's no time pressure.
  useEffect(() => {
    questionStartRef.current = Date.now();
    setElapsed(0);
    if (picked !== null) return;
    if (training) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - questionStartRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [index, picked, training]);

  const current = questions[index];
  const total = questions.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;

  function pick(i: number) {
    if (picked !== null || !current) return;
    const timeMs = Date.now() - questionStartRef.current;
    const isCorrect = i === current.correctIndex;
    // Fire immediate pick feedback, then a short follow-up for right/wrong
    // so users get an instant confirmation and a clear result sound.
    feedback.pick();
    window.setTimeout(() => {
      if (isCorrect) feedback.correct();
      else feedback.wrong();
    }, 90);
    setPicked(i);
    setElapsed(timeMs);
    setAnswers((prev) => [
      ...prev,
      { question: current, pickedIndex: i, isCorrect, timeMs },
    ]);
  }

  async function next() {
    if (index + 1 >= total) {
      await finish();
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  }

  async function finish() {
    setFinished(true);
    const results = [...answers];
    if (training) {
      const correct = results.filter((a) => a.isCorrect).length;
      const kinds: Record<string, { total: number; correct: number }> = {};
      for (const a of results) {
        const k = a.question.kind;
        if (!kinds[k]) kinds[k] = { total: 0, correct: 0 };
        kinds[k].total += 1;
        if (a.isCorrect) kinds[k].correct += 1;
      }
      addPracticeSession({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt: sessionStartRef.current,
        finishedAt: Date.now(),
        mode,
        total: results.length,
        correct,
        wrong: results.length - correct,
        kinds,
      });
      return;
    }
    try {
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          results: results.map((a) => ({
            wordId: a.question.wordId ?? null,
            kind: a.question.kind,
            prompt: a.question.prompt,
            correct: a.question.choices[a.question.correctIndex],
            picked: a.question.choices[a.pickedIndex],
            isCorrect: a.isCorrect,
            timeMs: a.timeMs,
          })),
        }),
      });
    } catch {}
    setTipsLoading(true);
    try {
      const res = await fetch("/api/progress/tips", { method: "POST" });
      const data = await res.json();
      setTips(data.tips);
    } catch {
      setTips(["Could not load AI tips."]);
    } finally {
      setTipsLoading(false);
    }
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-muted-foreground">No quiz loaded.</p>
          <Button asChild>
            <Link href="/quiz">Set up a quiz</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    return (
      <ResultsView
        answers={answers}
        total={total}
        correct={correctCount}
        tips={tips}
        tipsLoading={tipsLoading}
        training={training}
      />
    );
  }

  const isJapanesePrompt =
    current.kind === "kana_to_romaji" ||
    current.kind === "hiragana_char" ||
    current.kind === "katakana_char" ||
    current.kind === "kanji_to_meaning" ||
    current.kind === "kanji_to_reading";

  return (
    <div className="space-y-8">
      {training && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <Dumbbell className="size-3.5" />
          <span>
            <strong>Training session</strong> — no timer, results stay in
            your local Practice history and won't change your streak or
            Progress charts.
          </span>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Question {Math.min(index + 1, total)} / {total}
          </span>
          <span className="flex items-center gap-3">
            {!training && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatMs(elapsed)}
              </span>
            )}
            <span>{correctCount} correct</span>
          </span>
        </div>
        <Progress value={(index / total) * 100} />
      </div>

      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Badge variant="outline">{kindLabel(current.kind)}</Badge>
          <div
            className={cn(
              "font-bold",
              isJapanesePrompt ? "jp text-7xl" : "text-5xl",
            )}
          >
            {current.prompt}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.choices.map((choice, i) => {
          const isPicked = picked === i;
          const isCorrect = i === current.correctIndex;
          let stateCls =
            "border-input bg-card hover:bg-accent/50 hover:border-primary/40";
          if (picked !== null) {
            if (isCorrect)
              stateCls = "border-success bg-success/10 text-foreground";
            else if (isPicked)
              stateCls = "border-destructive bg-destructive/10 text-foreground";
            else stateCls = "border-input bg-card opacity-50";
          }
          return (
            <button
              key={`${current.id}_${i}`}
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={cn(
                "flex items-center gap-4 rounded-lg border px-5 py-4 text-left text-lg transition-colors disabled:cursor-not-allowed",
                stateCls,
              )}
            >
              <span className="text-sm font-bold text-muted-foreground">
                {LETTERS[i]}
              </span>
              <span className="jp flex-1">{choice}</span>
              {picked !== null && isCorrect && (
                <Check className="size-5 text-success" />
              )}
              {picked !== null && isPicked && !isCorrect && (
                <X className="size-5 text-destructive" />
              )}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="flex items-center justify-between gap-3">
          {training ? (
            <span className="text-sm text-muted-foreground">
              {answers[answers.length - 1]?.isCorrect
                ? "Nice — keep going."
                : "No worries, this one's just practice."}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="size-3.5" />
              Answered in {formatMs(elapsed)}
            </span>
          )}
          <Button size="lg" onClick={next}>
            {index + 1 >= total ? "Finish" : "Next"}
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function ResultsView({
  answers,
  total,
  correct,
  tips,
  tipsLoading,
  training,
}: {
  answers: Answer[];
  total: number;
  correct: number;
  tips: string[] | null;
  tipsLoading: boolean;
  training: boolean;
}) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const wrong = useMemo(
    () => answers.filter((a) => !a.isCorrect),
    [answers],
  );

  const avgMs =
    answers.length === 0
      ? 0
      : Math.round(
          answers.reduce((s, a) => s + a.timeMs, 0) / answers.length,
        );
  const slowest = useMemo(
    () =>
      [...answers]
        .filter((a) => a.isCorrect)
        .sort((a, b) => b.timeMs - a.timeMs)
        .slice(0, 3),
    [answers],
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <Badge variant={training ? "outline" : "secondary"}>
            {training ? (
              <span className="inline-flex items-center gap-1">
                <Dumbbell className="size-3" />
                Training session — not recorded
              </span>
            ) : (
              "Quiz complete"
            )}
          </Badge>
          <div className="text-6xl font-bold">{pct}%</div>
          <p className="text-muted-foreground">
            {training
              ? `${correct} / ${total} correct · logged to your local Practice history`
              : `${correct} / ${total} correct · avg ${formatMs(avgMs)} per question`}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link href="/quiz">New quiz</Link>
            </Button>
            {training ? (
              <Button asChild variant="outline">
                <Link href="/quiz#practice-history">
                  <History className="size-4" />
                  Practice history
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/progress">See progress</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!training && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              AI coach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tipsLoading && (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
                <Skeleton className="h-10 w-4/6" />
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
          </CardContent>
        </Card>
      )}

      {!training && slowest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Slowest answers (correct, but slow)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slowest.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{kindLabel(a.question.kind)}</Badge>
                  <span className="jp">{a.question.prompt}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{a.question.choices[a.question.correctIndex]}</span>
                </div>
                <Badge variant="secondary">{formatMs(a.timeMs)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {wrong.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review missed questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {wrong.map((a, i) => (
              <div key={i} className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{kindLabel(a.question.kind)}</Badge>
                  {!training && (
                    <Badge variant="secondary" className="ml-auto">
                      <Clock className="size-3 mr-1" />
                      {formatMs(a.timeMs)}
                    </Badge>
                  )}
                </div>
                <div className="jp text-2xl">{a.question.prompt}</div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="destructive">
                    Yours: {a.question.choices[a.pickedIndex]}
                  </Badge>
                  <Badge variant="success">
                    Correct: {a.question.choices[a.question.correctIndex]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "kana_to_romaji":
      return "Japanese → Romaji";
    case "romaji_to_english":
      return "Romaji → English";
    case "romaji_to_kana":
      return "Romaji → Hiragana";
    case "hiragana_char":
      return "Hiragana → Romaji";
    case "katakana_char":
      return "Katakana → Romaji";
    case "kanji_to_meaning":
      return "Kanji → Meaning";
    case "meaning_to_kanji":
      return "Meaning → Kanji";
    case "kanji_to_reading":
      return "Kanji → Reading";
    default:
      return kind;
  }
}
