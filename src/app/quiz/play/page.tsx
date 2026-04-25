"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Dumbbell,
  History,
  Trophy,
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
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/feedback";
import { addPracticeSession } from "@/lib/practice-history";
import { RedoMissedButton } from "@/components/redo-missed-button";
import { apiFetch } from "@/lib/api-client";

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

type UnlockedAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

type SrsOutcome = {
  questionIdx: number;
  itemType: "vocab" | "kanji" | "kana";
  itemKey: string;
  prevLevel: number;
  level: number;
  isNew: boolean;
  leveledUp: boolean;
  reset: boolean;
  mastered: boolean;
  totalCorrect: number;
  totalSeen: number;
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
  const [newlyUnlocked, setNewlyUnlocked] = useState<UnlockedAchievement[]>([]);
  const [srsOutcomes, setSrsOutcomes] = useState<SrsOutcome[]>([]);

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
      const data = await apiFetch<{
        newlyUnlocked?: UnlockedAchievement[];
        srs?: SrsOutcome[];
      }>("/api/quiz/submit", {
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
      if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
        setNewlyUnlocked(data.newlyUnlocked);
        feedback.correct();
      }
      if (Array.isArray(data.srs)) {
        setSrsOutcomes(data.srs);
      }
    } catch {
      // Submit failures are non-fatal — the user still sees their
      // results screen. Achievements + SRS will recover on the
      // next attempt. We swallow rather than surface because the
      // results UI doesn't have a good place to show this.
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
        training={training}
        newlyUnlocked={newlyUnlocked}
        mode={mode}
        srsOutcomes={srsOutcomes}
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
    // When an answer is picked we float the action bar over the bottom edge
    // (mobile only). The buffer must clear:
    //   bar's own padding (py-3 ≈ 24px) + button (≈ 44px) + border (1px)
    //   + iOS home-indicator safe-area (up to 34px on iPhone 14 Pro)
    // We add 9rem (144px) which covers the bar itself plus a generous tap
    // margin, then ADD the safe-area inset on top so the math is always
    // correct regardless of device. (On `sm:` the bar drops back into
    // normal flow so we zero this out.)
    <div
      className={cn(
        "space-y-6 sm:space-y-8",
        picked !== null &&
          "pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-0",
      )}
    >
      {training && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <Dumbbell className="size-3.5 shrink-0" />
          <span className="min-w-0">
            <strong>Training session</strong>
            <span className="hidden sm:inline">
              {" "}— no timer, results stay in your local Practice history and
              won&apos;t change your streak or Progress charts.
            </span>
            <span className="sm:hidden"> · practice only</span>
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
        <CardContent className="space-y-4 py-6 text-center sm:py-12">
          <Badge variant="outline">{kindLabel(current.kind)}</Badge>
          <div
            className={cn(
              "font-bold leading-tight break-words",
              isJapanesePrompt
                ? "jp text-6xl sm:text-7xl"
                : "text-3xl sm:text-5xl",
            )}
          >
            {current.prompt}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
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
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-base transition-colors disabled:cursor-not-allowed sm:gap-4 sm:px-5 sm:py-4 sm:text-lg",
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

      {/* Action bar: pinned to the bottom on mobile so Next is always within
          thumb reach, falls back to inline flow on sm+ where it fits without
          scrolling. The safe-area inset accounts for iOS home indicators. */}
      {picked !== null && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
            "pb-[max(env(safe-area-inset-bottom),0.75rem)]",
            "sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            {training ? (
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {answers[answers.length - 1]?.isCorrect
                  ? "Nice — keep going."
                  : "No worries, just practice."}
              </span>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                <span className="truncate">
                  Answered in {formatMs(elapsed)}
                </span>
              </span>
            )}
            <Button
              size="lg"
              onClick={next}
              autoFocus
              className="shrink-0"
            >
              {index + 1 >= total ? "Finish" : "Next"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsView({
  answers,
  total,
  correct,
  training,
  newlyUnlocked,
  mode,
  srsOutcomes,
}: {
  answers: Answer[];
  total: number;
  correct: number;
  training: boolean;
  newlyUnlocked: UnlockedAchievement[];
  mode: string;
  srsOutcomes: SrsOutcome[];
}) {
  // Index outcomes by question position so per-item rows can pull
  // their post-answer mastery without scanning the full array.
  const outcomeByIdx = useMemo(() => {
    const map = new Map<number, SrsOutcome>();
    for (const o of srsOutcomes) map.set(o.questionIdx, o);
    return map;
  }, [srsOutcomes]);

  // Kana quizzes get a dedicated per-item breakdown showing time +
  // mastery delta — Anki-style review log so users can see exactly
  // which character they're improving on.
  const isKanaQuiz =
    !training &&
    (mode === "hiragana" ||
      mode === "katakana" ||
      answers.some(
        (a) =>
          a.question.kind === "hiragana_char" ||
          a.question.kind === "katakana_char",
      ));
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

      {!training && newlyUnlocked.length > 0 && (
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Trophy className="size-4" />
              {newlyUnlocked.length === 1
                ? "Achievement unlocked!"
                : `${newlyUnlocked.length} achievements unlocked!`}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {newlyUnlocked.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-2xl ring-1 ring-inset ring-amber-500/40">
                  {a.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.description}
                  </div>
                </div>
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/achievements">View all achievements</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isKanaQuiz && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Kana breakdown
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each character with how long you took and where it sits in
              your spaced-repetition schedule.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">Kana</th>
                    <th className="px-2 py-2 text-left font-medium">
                      Your answer
                    </th>
                    <th className="px-2 py-2 text-right font-medium">Time</th>
                    <th className="px-2 py-2 text-right font-medium">
                      Mastery
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {answers.map((a, i) => {
                    const outcome = outcomeByIdx.get(i);
                    const correctText =
                      a.question.choices[a.question.correctIndex];
                    const pickedText = a.question.choices[a.pickedIndex];
                    return (
                      <tr
                        key={i}
                        className="border-b last:border-b-0 align-middle"
                      >
                        <td className="px-2 py-3 text-muted-foreground tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className="jp text-2xl font-bold">
                              {a.question.prompt}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              → {correctText}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                              a.isCorrect
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                            )}
                          >
                            {a.isCorrect ? (
                              <Check className="size-3" />
                            ) : (
                              <X className="size-3" />
                            )}
                            {pickedText}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          <Badge
                            variant={
                              a.timeMs > 5000
                                ? "destructive"
                                : a.timeMs > 2500
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {formatMs(a.timeMs)}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <SrsCell outcome={outcome} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <CardTitle>Review missed questions</CardTitle>
            {!training && (
              <RedoMissedButton
                limit={Math.min(20, Math.max(5, wrong.length))}
                variant="primary"
                label="Drill these now"
              />
            )}
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

// Map SRS levels (1..6) to a short human label and a tone class so the
// kana breakdown can show "Learning · L2 → L3" with the right color.
const SRS_LABEL: Record<number, string> = {
  1: "New",
  2: "Learning",
  3: "Reviewing",
  4: "Familiar",
  5: "Familiar+",
  6: "Mastered",
};

function srsTone(level: number): string {
  if (level >= 6)
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (level >= 4)
    return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
  if (level >= 3)
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
}

function SrsCell({ outcome }: { outcome: SrsOutcome | undefined }) {
  if (!outcome) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }
  const label = SRS_LABEL[outcome.level] ?? `L${outcome.level}`;
  const tone = srsTone(outcome.level);
  const moved = outcome.level !== outcome.prevLevel;
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
          tone,
        )}
      >
        {outcome.mastered && <Trophy className="size-3" />}
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {outcome.isNew
          ? `New · L${outcome.level}`
          : moved
            ? `L${outcome.prevLevel} → L${outcome.level}`
            : `L${outcome.level}`}
      </span>
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
