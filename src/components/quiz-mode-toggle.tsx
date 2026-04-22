"use client";

import { Dumbbell, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizSessionMode = "ranked" | "training";

export function QuizModeToggle({
  value,
  onChange,
}: {
  value: QuizSessionMode;
  onChange: (next: QuizSessionMode) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Session mode
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Ranked counts toward your streak and progress. Training is just for
        practice — it logs to your local history but never touches the
        server.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <ModeOption
          icon={<Trophy className="size-4" />}
          title="Ranked"
          description="Timed. Results saved to Progress and the streak."
          tone="primary"
          active={value === "ranked"}
          onClick={() => onChange("ranked")}
        />
        <ModeOption
          icon={<Dumbbell className="size-4" />}
          title="Training"
          description="No timer. Not recorded — only your local Practice history."
          tone="emerald"
          active={value === "training"}
          onClick={() => onChange("training")}
        />
      </div>
    </div>
  );
}

function ModeOption({
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
      bg: "bg-primary/5",
      iconWrap: "bg-primary/10 text-primary",
      activeBg: "border-primary bg-primary/10",
    },
    emerald: {
      ring: "ring-emerald-400/40",
      bg: "bg-emerald-500/5",
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
