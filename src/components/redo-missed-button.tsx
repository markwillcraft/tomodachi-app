"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";

type Variant = "primary" | "outline" | "ghost";

type Props = {
  // How many missed items to drill in this session.
  limit?: number;
  // Visual treatment — defaults to "outline" since this is usually a
  // secondary action next to other quiz entry points.
  variant?: Variant;
  // Override the label; defaults to "Redo last <limit> missed".
  label?: string;
  // Extra classes (sizing, alignment) for the button itself.
  className?: string;
  // Optional inline-start handler. Used by callers that are *already*
  // mounted at /quiz/play (the results screen) — pushing the same route
  // doesn't remount the player so the init effect never re-runs. When
  // provided, we skip navigation and hand the freshly-loaded questions
  // to the parent, which resets its own local state.
  onStart?: (questions: unknown[]) => void;
};

// Shared UX for "redo your recent wrong answers". The endpoint rebuilds
// fresh questions from `QuestionResult` history, we drop them into
// sessionStorage where /quiz/play already expects to find them, then
// route the user into the player. Counts as a real quiz attempt so it
// earns coins, advances streak, and shows up in Recent attempts.
export function RedoMissedButton({
  limit = 20,
  variant = "outline",
  label,
  className,
  onStart,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ questions?: unknown }>(
        `/api/quiz/redo-missed?limit=${limit}`,
      );
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setError("No missed questions to drill yet — take a quiz first.");
        return;
      }
      // When `onStart` owns the handoff we mark the cache `consumed: true`
      // immediately — the parent already has the questions in hand, and a
      // mid-run refresh should re-fetch via `generate` rather than reuse
      // a stale set. The route-push path keeps `consumed: false` so the
      // player can pick the questions up on its first mount.
      window.sessionStorage.setItem(
        "quiz",
        JSON.stringify({
          mode: "redo",
          questions: data.questions,
          training: false,
          generate: {
            method: "GET",
            url: `/api/quiz/redo-missed?limit=${limit}`,
          },
          consumed: Boolean(onStart),
        }),
      );
      if (onStart) {
        onStart(data.questions);
      } else {
        router.push("/quiz/play");
      }
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load missed questions."));
    } finally {
      setLoading(false);
    }
  }

  const buttonVariant: "default" | "outline" | "ghost" =
    variant === "primary" ? "default" : variant;

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        variant={buttonVariant}
        size="sm"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RotateCcw className="size-3.5" />
        )}
        {label ?? `Redo last ${limit} missed`}
      </Button>
      {error && (
        <span className="text-[11px] text-muted-foreground">{error}</span>
      )}
    </div>
  );
}
