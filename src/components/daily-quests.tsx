"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Coins, ListChecks, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyQuest } from "@/lib/coins";

type Props = {
  quests: DailyQuest[];
  earnedToday: number;
  resetsAt: string; // ISO string of the user's next local midnight
};

export function DailyQuests({ quests, earnedToday, resetsAt }: Props) {
  const completed = quests.filter((q) => q.completed).length;
  const totalReward = quests.reduce((s, q) => s + q.reward, 0);
  const claimedReward = quests
    .filter((q) => q.claimed)
    .reduce((s, q) => s + q.reward, 0);
  const completionPct = Math.round((completed / quests.length) * 100);
  const allDone = completed === quests.length;

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/10 via-background to-background shadow-sm">
      <div
        aria-hidden
        className="jp pointer-events-none absolute -right-6 -top-12 select-none text-[10rem] font-bold leading-none text-amber-500/5 sm:text-[14rem]"
      >
        任
      </div>

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
              <ListChecks className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                Daily quests
              </div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {allDone
                  ? "All quests complete — see you tomorrow"
                  : `${completed} of ${quests.length} complete`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Earn coins by finishing each quest. They reset every day.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ResetCountdown resetsAt={resetsAt} />
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200">
              <Coins className="size-3.5" />
              <span className="tabular-nums">+{earnedToday}</span>
              <span className="opacity-70">today</span>
            </div>
          </div>
        </header>

        {/* Master progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Daily progress
            </span>
            <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-200">
              {claimedReward} / {totalReward} coins
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
                allDone
                  ? "from-emerald-500 to-emerald-400"
                  : "from-amber-400 to-orange-500",
              )}
              style={{ width: `${Math.max(2, completionPct)}%` }}
            />
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {quests.map((q) => (
            <QuestRow key={q.id} quest={q} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function QuestRow({ quest }: { quest: DailyQuest }) {
  const pct = Math.min(
    100,
    Math.round((quest.current / quest.target) * 100),
  );
  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 overflow-hidden rounded-xl border bg-card/60 p-3 backdrop-blur-sm transition-colors",
        quest.completed
          ? "border-emerald-400/40 bg-emerald-500/5 dark:bg-emerald-500/10"
          : "hover:border-amber-400/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          quest.completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-muted-foreground/30 bg-background",
        )}
      >
        {quest.completed && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-sm font-semibold",
                quest.completed && "line-through opacity-70",
              )}
            >
              {quest.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {quest.description}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset",
              quest.claimed
                ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-200"
                : "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-200",
            )}
          >
            <Coins className="size-3" />
            {quest.claimed ? `+${quest.reward}` : `+${quest.reward}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
                quest.completed
                  ? "from-emerald-500 to-emerald-400"
                  : "from-amber-400 to-orange-500",
              )}
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
            {Math.min(quest.current, quest.target)} / {quest.target}
          </span>
        </div>
      </div>
    </li>
  );
}

function ResetCountdown({ resetsAt }: { resetsAt: string }) {
  const target = useMemo(() => new Date(resetsAt).getTime(), [resetsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Update every minute — second-by-second is unnecessary noise.
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, target - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const label =
    hours === 0
      ? `${minutes}m`
      : minutes === 0
        ? `${hours}h`
        : `${hours}h ${minutes}m`;

  return (
    <div
      title={`Resets at ${new Date(resetsAt).toLocaleString()}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
    >
      <Timer className="size-3.5" />
      Resets in <span className="tabular-nums">{label}</span>
    </div>
  );
}
