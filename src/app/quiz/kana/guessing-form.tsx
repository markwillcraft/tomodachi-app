"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { KANA_GROUPS, type KanaScript } from "@/lib/kana";
import { cn } from "@/lib/utils";
import {
  QuizModeToggle,
  type QuizSessionMode,
} from "@/components/quiz-mode-toggle";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";

const COUNT_OPTIONS = [10, 20, 30, 50];

// The original Kana Guessing form, extracted so the parent page can
// branch between this and the Reading Session picker without ballooning
// into one giant client island. Behavior here is unchanged from the
// pre-Reading-mode version of `src/app/quiz/kana/page.tsx`.
export function KanaGuessingForm() {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [sessionMode, setSessionMode] = useState<QuizSessionMode>("ranked");
  const [script, setScript] = useState<KanaScript>("both");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["a", "k", "s", "t", "n"]),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalChars = useMemo(() => {
    const groups = KANA_GROUPS.filter((g) => selected.has(g.id));
    const perScript = groups.reduce((s, g) => s + g.romaji.length, 0);
    return script === "both" ? perScript * 2 : perScript;
  }, [selected, script]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(type: "all" | "gojuon" | "dakuten" | "handakuten") {
    setSelected(
      new Set(
        KANA_GROUPS.filter((g) => type === "all" || g.type === type).map(
          (g) => g.id,
        ),
      ),
    );
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function start() {
    if (selected.size === 0) {
      setError("Pick at least one row.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // For "both", we send the request as either hiragana or katakana mode
      // and let the API split the subset. The play UI cares about
      // hiragana_char vs katakana_char question kinds.
      const mode = script === "katakana" ? "katakana" : "hiragana";
      const generateBody = {
        count,
        mode,
        kanaScript: script,
        kanaGroups: Array.from(selected),
      };
      const data = await apiFetch<{ questions: unknown[] }>(
        "/api/quiz/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generateBody),
        },
      );
      sessionStorage.setItem(
        "quiz",
        JSON.stringify({
          mode,
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
    <div className="space-y-8">
      <QuizModeToggle value={sessionMode} onChange={setSessionMode} />

      <Card>
        <CardHeader>
          <CardTitle>Script</CardTitle>
          <CardDescription>
            Quiz hiragana, katakana, or mix both.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "hiragana", label: "Hiragana only · ひらがな" },
                { id: "katakana", label: "Katakana only · カタカナ" },
                { id: "both", label: "Both · ひらがな + カタカナ" },
              ] as Array<{ id: KanaScript; label: string }>
            ).map((opt) => (
              <Button
                key={opt.id}
                variant={script === opt.id ? "default" : "outline"}
                onClick={() => setScript(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Rows</CardTitle>
              <CardDescription>
                Multiple selections allowed. Click a row to toggle.
              </CardDescription>
            </div>
            <Badge variant="secondary">{totalChars} characters</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => selectAll("all")}>
              All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => selectAll("gojuon")}
            >
              Basic (gojūon)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => selectAll("dakuten")}
            >
              Dakuten (が, ざ...)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => selectAll("handakuten")}
            >
              Handakuten (ぱ...)
            </Button>
            <Button size="sm" variant="ghost" onClick={selectNone}>
              None
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {KANA_GROUPS.map((g) => {
              const isOn = selected.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isOn
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-card text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  <div className="font-medium">{g.label}</div>
                  <div className="text-[10px] uppercase opacity-70">
                    {g.type}
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
        <Button size="lg" onClick={start} disabled={loading}>
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
