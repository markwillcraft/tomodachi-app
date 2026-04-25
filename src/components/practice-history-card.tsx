"use client";

import { useEffect, useState } from "react";
import { Dumbbell, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearPracticeHistory,
  getPracticeHistory,
  modeLabel,
  type PracticeSession,
} from "@/lib/practice-history";

const MODE_TONE: Record<string, string> = {
  vocab: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  hiragana: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  katakana: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  kanji: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

function formatDuration(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US");
}

export function PracticeHistoryCard() {
  const [items, setItems] = useState<PracticeSession[] | null>(null);

  useEffect(() => {
    setItems(getPracticeHistory());
  }, []);

  function handleClear() {
    clearPracticeHistory();
    setItems([]);
  }

  return (
    <section
      id="practice-history"
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 sm:p-6"
    >
      <div
        aria-hidden
        className="jp pointer-events-none absolute -right-4 -bottom-6 select-none text-[7rem] font-bold leading-none text-emerald-500/10 sm:text-[9rem]"
      >
        練
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
            <History className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
              <Dumbbell className="size-3.5" />
              Training mode
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Practice history
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Your last 50 training sessions, kept locally on this device.
              These never affect your streak or Progress.
            </p>
          </div>
        </div>
        {items && items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="relative mt-4">
        {items === null ? (
          <div className="rounded-xl border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Dumbbell className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">
              No practice sessions yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a quiz mode above and switch to{" "}
              <span className="font-medium text-foreground">Training</span>{" "}
              to start logging here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card/70 backdrop-blur-sm">
            {items.map((s) => {
              const pct =
                s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100);
              const tone =
                MODE_TONE[s.mode] ??
                "bg-slate-500/10 text-slate-600 dark:text-slate-300";
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        tone,
                      )}
                    >
                      {modeLabel(s.mode)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {s.correct} / {s.total} correct
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelative(s.finishedAt)} ·{" "}
                        {formatDuration(s.finishedAt - s.startedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct >= 80
                            ? "bg-emerald-500"
                            : pct >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "min-w-[3ch] text-right text-sm font-semibold tabular-nums",
                        pct >= 80
                          ? "text-emerald-600 dark:text-emerald-300"
                          : pct >= 50
                            ? "text-amber-600 dark:text-amber-300"
                            : "text-rose-600 dark:text-rose-300",
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
