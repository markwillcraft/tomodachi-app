"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Play } from "lucide-react";
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
import {
  QuizModeToggle,
  type QuizSessionMode,
} from "@/components/quiz-mode-toggle";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";

const COUNT_OPTIONS = [10, 20, 30, 50];

type GenerateResponse = {
  questions: unknown[];
};

export function VocabQuizForm({ wordCount }: { wordCount: number }) {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [sessionMode, setSessionMode] = useState<QuizSessionMode>("ranked");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const generateBody = { count, mode: "vocab" as const };
      const data = await apiFetch<GenerateResponse>("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateBody),
      });
      sessionStorage.setItem(
        "quiz",
        JSON.stringify({
          mode: "vocab",
          questions: data.questions,
          training: sessionMode === "training",
          generate: {
            method: "POST",
            url: "/api/quiz/generate",
            body: generateBody,
          },
          consumed: false,
        }),
      );
      router.push("/quiz/play");
    } catch (e) {
      setError(apiErrorMessage(e, "Failed to start quiz"));
      setLoading(false);
    }
  }

  return (
    <>
      {wordCount === 0 && (
        <Alert>
          <AlertDescription>
            You haven&apos;t imported any vocab yet.{" "}
            <Link href="/import" className="underline">
              Import some words
            </Link>{" "}
            first.
          </AlertDescription>
        </Alert>
      )}

      <QuizModeToggle value={sessionMode} onChange={setSessionMode} />

      <Card>
        <CardHeader>
          <CardTitle>How many questions?</CardTitle>
          <CardDescription>
            Drawing from {wordCount} word{wordCount === 1 ? "" : "s"} in your
            library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={count === n ? "default" : "outline"}
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            {sessionMode === "ranked"
              ? "Daily streak goal: 50 quiz questions answered."
              : "Training sessions don't count toward your streak."}
          </div>
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
          disabled={loading || wordCount === 0}
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
    </>
  );
}
