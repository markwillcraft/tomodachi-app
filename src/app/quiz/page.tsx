"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const COUNTS = [5, 10, 20, 50];
const MODES = [
  { id: "vocab", label: "Vocabulary", desc: "Uses your imported words." },
  { id: "hiragana", label: "Hiragana", desc: "Single hiragana characters." },
  { id: "katakana", label: "Katakana", desc: "Single katakana characters." },
  { id: "mixed", label: "Mixed", desc: "Vocab + hiragana + katakana." },
] as const;

type ModeId = (typeof MODES)[number]["id"];

export default function QuizSetupPage() {
  const router = useRouter();
  const [count, setCount] = useState<number>(10);
  const [customCount, setCustomCount] = useState<string>("");
  const [mode, setMode] = useState<ModeId>("vocab");
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/words")
      .then((r) => r.json())
      .then((d) => setWordCount(d.words.length));
  }, []);

  const effectiveCount = customCount
    ? Math.max(1, Math.min(200, Number(customCount) || 0))
    : count;

  const vocabUnavailable =
    mode === "vocab" && wordCount !== null && wordCount === 0;

  const lowVocabWarning =
    (mode === "vocab" || mode === "mixed") &&
    wordCount !== null &&
    wordCount > 0 &&
    wordCount < 4;

  async function startQuiz() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: effectiveCount, mode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not generate quiz");
      }
      const data = await res.json();
      sessionStorage.setItem(
        "quiz",
        JSON.stringify({ mode, questions: data.questions }),
      );
      router.push("/quiz/play");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Start a quiz</h1>

      <Card>
        <CardHeader>
          <CardTitle>How many questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {COUNTS.map((c) => (
              <Button
                key={c}
                variant={!customCount && count === c ? "default" : "outline"}
                onClick={() => {
                  setCount(c);
                  setCustomCount("");
                }}
              >
                {c}
              </Button>
            ))}
            <div className="flex items-center gap-2">
              <Label htmlFor="custom" className="text-muted-foreground">
                or
              </Label>
              <Input
                id="custom"
                type="number"
                min={1}
                max={200}
                placeholder="Custom"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                className="w-28"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mode</CardTitle>
          <CardDescription>What kind of questions to ask</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as ModeId)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {MODES.map((m) => (
              <Label
                key={m.id}
                htmlFor={`mode-${m.id}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30",
                  mode === m.id && "border-primary bg-accent/30",
                )}
              >
                <RadioGroupItem
                  value={m.id}
                  id={`mode-${m.id}`}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-sm text-muted-foreground">{m.desc}</div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {vocabUnavailable && (
        <Alert variant="warning">
          <AlertDescription>
            You have no vocabulary words yet.{" "}
            <a href="/import" className="underline">
              Import some
            </a>{" "}
            to use Vocabulary mode.
          </AlertDescription>
        </Alert>
      )}
      {lowVocabWarning && (
        <Alert variant="warning">
          <AlertDescription>
            Heads up: you only have {wordCount} word(s) imported. Distractors
            will repeat. Add more for better quizzes.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        size="lg"
        onClick={startQuiz}
        disabled={starting || vocabUnavailable}
      >
        {starting ? <Loader2 className="animate-spin" /> : <Play />}
        {starting ? "Building quiz…" : `Start ${effectiveCount}-question quiz`}
      </Button>
    </div>
  );
}
