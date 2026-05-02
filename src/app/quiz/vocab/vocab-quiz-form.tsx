"use client";

import { useId, useMemo, useState } from "react";
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

const COUNT_OPTIONS = [10, 20, 30, 50, 100] as const;
const COUNT_MIN = 1;
const COUNT_MAX = 200;

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

// Multi-select picker state. Three independent groups:
//
//  - `batchIds`        — user library batches (category- or import-sourced).
//  - `includeImported` — synthetic "Imported Words" group (anything not in
//                        a `source: "category"` batch).
//  - `catalogSlugs`    — N5 catalog topics the user hasn't added yet; each
//                        selected slug is auto-added on Start.
//
// All three empty is the implicit "All" state — there is no
// `kind: "all"` flag, the empty struct IS "all".
type Selection = {
  batchIds: Set<number>;
  includeImported: boolean;
  catalogSlugs: Set<string>;
};

const EMPTY_SELECTION: Selection = {
  batchIds: new Set(),
  includeImported: false,
  catalogSlugs: new Set(),
};

function isAllSelected(s: Selection): boolean {
  return (
    s.batchIds.size === 0 && !s.includeImported && s.catalogSlugs.size === 0
  );
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return COUNT_MIN;
  const rounded = Math.floor(value);
  if (rounded < COUNT_MIN) return COUNT_MIN;
  if (rounded > COUNT_MAX) return COUNT_MAX;
  return rounded;
}

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
  const customInputId = useId();
  const [count, setCount] = useState(20);
  const [countDraft, setCountDraft] = useState("20");
  const [sessionMode, setSessionMode] = useState<QuizSessionMode>("ranked");
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unaddedCatalog = useMemo(
    () => catalogTopics.filter((t) => !t.alreadyAdded),
    [catalogTopics],
  );

  const batchById = useMemo(
    () => new Map(categoryBatches.map((b) => [b.id, b])),
    [categoryBatches],
  );
  const catalogBySlug = useMemo(
    () => new Map(catalogTopics.map((t) => [t.slug, t])),
    [catalogTopics],
  );

  const allSelected = isAllSelected(selection);

  // Sum of words available across the selected groups. Drives the
  // auto-cap helper, the Start button label, and the empty-pool guard.
  // When everything is empty we pivot to the implicit "All" total.
  const availableCount = useMemo(() => {
    if (allSelected) return wordCount;
    let total = 0;
    for (const id of selection.batchIds) {
      total += batchById.get(id)?.count ?? 0;
    }
    if (selection.includeImported) total += importedCount;
    for (const slug of selection.catalogSlugs) {
      total += catalogBySlug.get(slug)?.count ?? 0;
    }
    return total;
  }, [
    allSelected,
    wordCount,
    selection,
    batchById,
    catalogBySlug,
    importedCount,
  ]);

  const willCap = availableCount > 0 && availableCount < count;
  const effectiveCount = Math.min(count, availableCount);
  const hasCatalogPick = selection.catalogSlugs.size > 0;
  const noPool = availableCount === 0;

  function selectAll() {
    setSelection(EMPTY_SELECTION);
  }

  function toggleBatch(id: number) {
    setSelection((prev) => {
      const next = new Set(prev.batchIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, batchIds: next };
    });
  }

  function toggleImported() {
    setSelection((prev) => ({
      ...prev,
      includeImported: !prev.includeImported,
    }));
  }

  function toggleCatalog(slug: string) {
    setSelection((prev) => {
      const next = new Set(prev.catalogSlugs);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return { ...prev, catalogSlugs: next };
    });
  }

  function pickPresetCount(n: number) {
    setCount(n);
    setCountDraft(String(n));
  }

  function handleCountInput(raw: string) {
    setCountDraft(raw);
    if (raw.trim() === "") return; // let the user clear the field briefly
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    setCount(clampCount(parsed));
  }

  function handleCountBlur() {
    // On blur, snap the visible draft back to the canonical count so an
    // intermediate empty/invalid state can never persist.
    setCountDraft(String(count));
  }

  async function start() {
    setLoading(true);
    setError(null);
    try {
      // Resolve batch ids first. If the user picked any unadded N5
      // catalog topics, fan out the auto-add calls in parallel and
      // merge the returned batch ids before generating. The
      // `/api/categories/add` route is idempotent (looks up the
      // existing batch by name before creating one), so a retry after
      // a partial failure is safe.
      const resolvedBatchIds = new Set(selection.batchIds);

      if (selection.catalogSlugs.size > 0) {
        const slugs = [...selection.catalogSlugs];
        const responses = await Promise.all(
          slugs.map((slug) =>
            apiFetch<AddCategoryResponse>("/api/categories/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug }),
            }),
          ),
        );
        for (const r of responses) resolvedBatchIds.add(r.batch.id);

        // Mirror the now-added catalog into local selection so a
        // re-Start without navigation skips the add path.
        setSelection({
          batchIds: resolvedBatchIds,
          includeImported: selection.includeImported,
          catalogSlugs: new Set(),
        });
      }

      const useFilter =
        resolvedBatchIds.size > 0 || selection.includeImported;
      const generateBody = {
        count,
        mode: "vocab" as const,
        ...(useFilter
          ? {
              vocabFilter: {
                batchIds: [...resolvedBatchIds],
                includeImported: selection.includeImported,
              },
            }
          : {}),
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

  const sourceSummary = describeSource(selection, {
    wordCount,
    importedCount,
    batchById,
    catalogBySlug,
  });

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
            Pick one or more categories to drill, or quiz the full library.
            Picking from the N5 catalog auto-adds the words to your library
            when you start.
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
                checked={allSelected}
                disabled={wordCount === 0}
                onToggle={selectAll}
              />
              {categoryBatches.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.name} (${b.count})`}
                  checked={selection.batchIds.has(b.id)}
                  disabled={b.count === 0}
                  onToggle={() => toggleBatch(b.id)}
                />
              ))}
              <Chip
                label={`Imported Words (${importedCount})`}
                checked={selection.includeImported}
                disabled={importedCount === 0}
                onToggle={toggleImported}
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
                    checked={selection.catalogSlugs.has(t.slug)}
                    onToggle={() => toggleCatalog(t.slug)}
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
          <CardDescription>{sourceSummary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {COUNT_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={count === n ? "default" : "outline"}
                onClick={() => pickPresetCount(n)}
              >
                {n}
              </Button>
            ))}
            <div className="flex items-center gap-2 pl-1">
              <label
                htmlFor={customInputId}
                className="text-xs text-muted-foreground"
              >
                Custom
              </label>
              <input
                id={customInputId}
                type="number"
                inputMode="numeric"
                min={COUNT_MIN}
                max={COUNT_MAX}
                step={1}
                value={countDraft}
                onChange={(e) => handleCountInput(e.target.value)}
                onBlur={handleCountBlur}
                className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          {willCap && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Only {availableCount} word{availableCount === 1 ? "" : "s"}{" "}
              available in this selection — quiz will be {availableCount}{" "}
              question{availableCount === 1 ? "" : "s"}.
            </div>
          )}
          {noPool && !allSelected && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              This selection has no words yet. Pick another or add some
              first.
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
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {hasCatalogPick ? "Adding & starting..." : "Starting..."}
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

function describeSource(
  selection: Selection,
  ctx: {
    wordCount: number;
    importedCount: number;
    batchById: Map<number, CategoryBatchProp>;
    catalogBySlug: Map<string, CatalogTopicProp>;
  },
): string {
  if (isAllSelected(selection)) {
    const n = ctx.wordCount;
    return `Drawing from ${n} word${n === 1 ? "" : "s"} in your library.`;
  }

  const parts: string[] = [];
  for (const id of selection.batchIds) {
    const b = ctx.batchById.get(id);
    if (b) parts.push(b.name);
  }
  if (selection.includeImported) {
    parts.push(`Imported Words (${ctx.importedCount})`);
  }
  for (const slug of selection.catalogSlugs) {
    const t = ctx.catalogBySlug.get(slug);
    if (t) parts.push(`${t.name} (${t.level})`);
  }

  if (parts.length === 0) {
    // All groups empty but the explicit "All" toggle wasn't tapped —
    // shouldn't really happen, but degrade gracefully.
    return `Drawing from ${ctx.wordCount} word${ctx.wordCount === 1 ? "" : "s"} in your library.`;
  }

  const list =
    parts.length <= 2
      ? parts.join(" + ")
      : `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;
  return `Drawing from ${list}.`;
}

function Chip({
  label,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  function handleKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    // <button> already activates on Enter; add Space so the chip behaves
    // like a real checkbox per ARIA.
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (!disabled) onToggle();
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      onKeyDown={handleKey}
      disabled={disabled}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors " +
        (checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted") +
        (disabled ? " cursor-not-allowed opacity-40 hover:bg-muted/40" : "")
      }
    >
      {label}
    </button>
  );
}
