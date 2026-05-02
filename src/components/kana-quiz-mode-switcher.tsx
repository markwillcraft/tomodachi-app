"use client";

import { BookOpen, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type KanaQuizMode = "guessing" | "reading";

// Top-level mode switcher for the Hiragana / Katakana quiz setup
// page. Sits where `QuizModeToggle` (Ranked vs Training) used to live;
// `QuizModeToggle` is still rendered *inside* the Guessing branch.
//
// Two tiles, mirror-styled to the existing ModeOption pattern from
// `quiz-mode-toggle.tsx` so the visual language stays consistent
// across the quiz family. Color is reserved for meaning: primary
// for the multiple-choice scoring path, emerald for the passive
// reading drill.
export function KanaQuizModeSwitcher({
  value,
  onChange,
}: {
  value: KanaQuizMode;
  onChange: (next: KanaQuizMode) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Session mode
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Pick how you want to drill. Kana Guessing is a scored
        multiple-choice quiz; Reading Session is a passive
        flashcard run that walks you through a daily set.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <ModeTile
          icon={<Trophy className="size-4" />}
          title="Kana Guessing"
          description="Multiple-choice drill with Ranked or Training scoring."
          tone="primary"
          active={value === "guessing"}
          onClick={() => onChange("guessing")}
        />
        <ModeTile
          icon={<BookOpen className="size-4" />}
          title="Reading Session"
          description="Passive timed flashcards across 4 stages by syllable length."
          tone="emerald"
          active={value === "reading"}
          onClick={() => onChange("reading")}
        />
      </div>
    </div>
  );
}

function ModeTile({
  icon,
  title,
  description,
  tone,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "primary" | "emerald";
  active: boolean;
  onClick: () => void;
}) {
  const TONE = {
    primary: {
      ring: "ring-primary/40",
      iconWrap: "bg-primary/10 text-primary",
      activeBg: "border-primary bg-primary/10",
    },
    emerald: {
      ring: "ring-emerald-400/40",
      iconWrap:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      activeBg: "border-emerald-400/60 bg-emerald-500/10",
    },
  } as const;
  const styles = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
        active
          ? cn("ring-2 ring-offset-0", styles.ring, styles.activeBg)
          : "border-input bg-card hover:bg-accent/40",
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
          styles.iconWrap,
        )}
      >
        {icon}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {active && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                styles.iconWrap,
              )}
            >
              Selected
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {description}
        </div>
      </div>
    </button>
  );
}
