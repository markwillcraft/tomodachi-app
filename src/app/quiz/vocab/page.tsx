"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Play } from "lucide-react";
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

const COUNT_OPTIONS = [10, 20, 30, 50];

export default function VocabQuizSetupPage() {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/words")
      .then((r) => r.json())
      .then((data: { words: unknown[] }) => setWordCount(data.words.length))
      .catch(() => setWordCount(0));
  }, []);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, mode: "vocab" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start quiz");
      sessionStorage.setItem(
        "quiz",
        JSON.stringify({ mode: "vocab", questions: data.questions }),
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
          <BookOpen className="size-6" />
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary quiz</h1>
        </div>
        <p className="text-muted-foreground">
          Mixed kana ↔ romaji ↔ English questions, weighted toward words
          you've gotten wrong before.
        </p>
      </section>

      {wordCount === 0 && (
        <Alert>
          <AlertDescription>
            You haven't imported any vocab yet.{" "}
            <Link href="/import" className="underline">
              Import some words
            </Link>{" "}
            first.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How many questions?</CardTitle>
          <CardDescription>
            {wordCount === null
              ? "Loading library..."
              : `Drawing from ${wordCount} word${wordCount === 1 ? "" : "s"} in your library.`}
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
            Daily streak goal: 50 quiz questions answered.
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
    </div>
  );
}
