"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Play, Sparkles } from "lucide-react";
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
  effectiveCount?: number;
};

type AddCategoryResponse = {
  added: number;
  batch: { id: number; name: string };
};

export type CategoryBatchProp = {
  id: number;
  name: string;
  count: number;
};

export type CatalogTopicProp = {
  slug: string;
  name: string;
  level: "N5";
  count: number;
  batchName: string;
  alreadyAdded: boolean;
};

// All possible picker selections. `count` is the *current* size of the
// chosen pool — the server still re-checks and caps but we mirror it on
// the client so the user sees the truth before they hit Start.
type Selection =
  | { kind: "all" }
  | { kind: "batch"; batchId: number; name: string; count: number }
  | { kind: "imported"; count: number }
  | {
      kind: "catalog";
      slug: string;
      name: string;
      level: "N5";
      count: number;
    };

export function VocabQuizForm({
  wordCount,
  importedCount,
  categoryBatches,
  catalogTopics,
}: {
  wordCount: number;
  importedCount: number;
  categoryBatches: CategoryBatchProp[];
  catalogTopics: CatalogTopicProp[];
}) {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [sessionMode, setSessionMode] = useState<QuizSessionMode>("ranked");
  const [selection, setSelection] = useState<Selection>({ kind: "all" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The N5 topics the user hasn't added yet. The "Adds to library" chip
  // section only appears when this list is non-empty.
  const unaddedCatalog = useMemo(
    () => catalogTopics.filter((t) => !t.alreadyAdded),
    [catalogTopics],
  );

  // How many words are actually available for the chosen selection.
  // Drives the auto-cap helper text and disables Start when zero.
  const availableCount = useMemo(() => {
    switch (selection.kind) {
      case "all":
        return wordCount;
      case "batch":
        return selection.count;
      case "imported":
        return selection.count;
      case "catalog":
        return selection.count;
    }
  }, [selection, wordCount]);

  const willCap = availableCount > 0 && availableCount < count;
  const effectiveCount = Math.min(count, availableCount);

  const isCatalogPick = selection.kind === "catalog";
  const noPool = availableCount === 0;

  async function start() {
    setLoading(true);
    setError(null);
    try {
      // Step 1: if the user picked a catalog topic that isn't in their
      // library yet, auto-add it first so we have a real batchId to
      // filter by. We accepted "auto-add on Start" as the design — see
      // the plan UX. The `/api/categories/add` route is idempotent
      // (looks up the existing batch by name before creating one), so a
      // double-click is safe.
      let resolved: Exclude<Selection, { kind: "catalog" }> = (() => {
        switch (selection.kind) {
          case "all":
            return { kind: "all" };
          case "batch":
            return selection;
          case "imported":
            return selection;
          case "catalog":
            // Replaced below.
            return { kind: "all" };
        }
      })();

      if (selection.kind === "catalog") {
        const addResp = await apiFetch<AddCategoryResponse>(
          "/api/categories/add",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: selection.slug }),
          },
        );
        resolved = {
          kind: "batch",
          batchId: addResp.batch.id,
          name: addResp.batch.name,
          count: selection.count,
        };
        // Reflect the now-added category in local state so a subsequent
        // Start (without a navigation) doesn't re-trigger the add path.
        setSelection(resolved);
      }

      const vocabFilter =
        resolved.kind === "all"
          ? undefined
          : resolved.kind === "imported"
            ? ({ kind: "imported" } as const)
            : ({ kind: "batch", batchId: resolved.batchId } as const);

      const generateBody = {
        count,
        mode: "vocab" as const,
        ...(vocabFilter ? { vocabFilter } : {}),
      };

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
      {wordCount === 0 && unaddedCatalog.length === 0 && (
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

      <Card>
        <CardHeader>
          <CardTitle>Category</CardTitle>
          <CardDescription>
            Pick a category to drill, or quiz the full library. Picking from
            the N5 catalog auto-adds the words to your library when you start.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your library
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label={`All (${wordCount})`}
                active={selection.kind === "all"}
                disabled={wordCount === 0}
                onClick={() => setSelection({ kind: "all" })}
              />
              {categoryBatches.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.name} (${b.count})`}
                  active={
                    selection.kind === "batch" && selection.batchId === b.id
                  }
                  disabled={b.count === 0}
                  onClick={() =>
                    setSelection({
                      kind: "batch",
                      batchId: b.id,
                      name: b.name,
                      count: b.count,
                    })
                  }
                />
              ))}
              <Chip
                label={`Imported Words (${importedCount})`}
                active={selection.kind === "imported"}
                disabled={importedCount === 0}
                onClick={() =>
                  setSelection({ kind: "imported", count: importedCount })
                }
              />
            </div>
          </div>

          {unaddedCatalog.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3" />
                From N5 catalog · adds to library on Start
              </div>
              <div className="flex flex-wrap gap-2">
                {unaddedCatalog.map((t) => (
                  <Chip
                    key={t.slug}
                    label={`${t.name} (${t.level}) · ${t.count}`}
                    active={
                      selection.kind === "catalog" && selection.slug === t.slug
                    }
                    onClick={() =>
                      setSelection({
                        kind: "catalog",
                        slug: t.slug,
                        name: t.name,
                        level: t.level,
                        count: t.count,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <QuizModeToggle value={sessionMode} onChange={setSessionMode} />

      <Card>
        <CardHeader>
          <CardTitle>How many questions?</CardTitle>
          <CardDescription>
            {describeSource(selection, wordCount)}
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
          {willCap && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Only {availableCount} word{availableCount === 1 ? "" : "s"}{" "}
              available in this category — quiz will be {availableCount}{" "}
              question{availableCount === 1 ? "" : "s"}.
            </div>
          )}
          {noPool && selection.kind !== "all" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              This category has no words yet. Pick another or add some first.
            </div>
          )}
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
          disabled={loading || noPool}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isCatalogPick ? "Adding & starting..." : "Starting..."}
            </>
          ) : (
            <>
              <Play className="size-4" />
              Start quiz
              <Badge variant="secondary" className="ml-2">
                {effectiveCount}
              </Badge>
            </>
          )}
        </Button>
      </div>
    </>
  );
}

function describeSource(selection: Selection, totalLibrary: number): string {
  switch (selection.kind) {
    case "all":
      return `Drawing from ${totalLibrary} word${totalLibrary === 1 ? "" : "s"} in your library.`;
    case "batch":
      return `Drawing from ${selection.count} word${selection.count === 1 ? "" : "s"} in ${selection.name}.`;
    case "imported":
      return `Drawing from ${selection.count} imported word${selection.count === 1 ? "" : "s"}.`;
    case "catalog":
      return `Drawing from the ${selection.count}-word ${selection.name} (${selection.level}) catalog. The words will be added to your library when you start.`;
  }
}

function Chip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted") +
        (disabled ? " cursor-not-allowed opacity-40 hover:bg-muted/40" : "")
      }
    >
      {label}
    </button>
  );
}
