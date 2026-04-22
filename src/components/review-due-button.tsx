"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";

type Props = {
  // How many due items to drill in this session. The server caps at 50.
  limit?: number;
  variant?: Variant;
  label?: string;
  className?: string;
};

// Kicks off a spaced-repetition review session. Pulls questions from
// /api/study/review (items whose `nextReviewAt` has passed), stores
// them in sessionStorage, and routes to /quiz/play. Mode "review" so
// it shows up distinctly in Recent attempts; `training: false` so
// answers still feed back into streak, coins, and SRS progression.
export function ReviewDueButton({
  limit = 20,
  variant = "primary",
  label,
  className,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/study/review?limit=${limit}`);
      if (!res.ok) {
        setError("Could not load your review queue.");
        return;
      }
      const data = (await res.json()) as { questions?: unknown };
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setError("Nothing due right now — come back later.");
        return;
      }
      window.sessionStorage.setItem(
        "quiz",
        JSON.stringify({
          mode: "review",
          questions: data.questions,
          training: false,
        }),
      );
      router.push("/quiz/play");
    } catch {
      setError("Network error.");
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
          <BrainCircuit className="size-3.5" />
        )}
        {label ?? `Review ${limit} due`}
      </Button>
      {error && (
        <span className="text-[11px] text-muted-foreground">{error}</span>
      )}
    </div>
  );
}
