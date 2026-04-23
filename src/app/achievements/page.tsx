import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ChevronRight, Crown, Sparkles, Target, Trophy } from "lucide-react";
import {
  getAchievementsProgress,
  type AchievementProgress,
  type N5Snapshot,
} from "@/lib/achievements";
import type { N5PathsSnapshot } from "@/lib/n5-paths";
import { cn } from "@/lib/utils";
import { AchievementsTabs } from "./achievements-tabs";
import { N5MasteryModal } from "./n5-mastery-modal";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { items, unlockedCount, totalCount, n5, n5Paths } =
    await getAchievementsProgress(userId);

  const unlockedPct =
    totalCount === 0 ? 0 : Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/15 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[10rem] font-bold leading-none text-amber-500/10 sm:text-[14rem]"
        >
          章
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600/90 dark:text-amber-300/90">
              <Trophy className="size-3.5" />
              Achievements
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your milestones
            </h1>
            <p className="max-w-2xl text-muted-foreground sm:text-lg">
              One-time unlocks across {totalCount} milestones — streak, study,
              mastery, and the grand N5 goal. Switch tabs below to focus on a
              single path.
            </p>
          </div>
          <div className="flex min-w-[12rem] flex-col gap-2 rounded-xl border bg-card/70 p-4 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unlocked
              </span>
              <span className="tabular-nums text-2xl font-bold">
                {unlockedCount}
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  / {totalCount}
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
                style={{ width: `${Math.max(4, unlockedPct)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {unlockedPct}% complete
            </span>
          </div>
        </div>
      </section>

      <N5GrandCard snapshot={n5} paths={n5Paths} />

      <ClosestToUnlockingCard items={items} />

      <AchievementsTabs items={items} />

      <section className="flex items-start gap-3 rounded-xl border bg-gradient-to-r from-amber-500/5 via-muted/30 to-transparent p-5 text-sm text-muted-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
          <Sparkles className="size-4" />
        </span>
        <div>
          <strong className="text-foreground">How achievements work:</strong>{" "}
          these are lifetime milestones — each unlocks once and stays unlocked
          forever. Goals re-evaluate automatically after every quiz and when
          you open the app, so nothing ever gets missed.
        </div>
      </section>
    </div>
  );
}

function N5GrandCard({
  snapshot,
  paths,
}: {
  snapshot: N5Snapshot;
  paths: N5PathsSnapshot;
}) {
  const { kanji, kana, vocab, pct } = snapshot;
  const unlocked = pct >= 100;
  const trigger = (
    <button
      type="button"
      aria-label="Open N5 mastery breakdown"
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-6",
        unlocked
          ? "border-rose-500/50 bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-card hover:border-rose-500/70"
          : "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card hover:border-rose-500/50",
      )}
    >
      <div
        aria-hidden
        className="jp pointer-events-none absolute -right-4 -bottom-12 select-none text-[12rem] font-bold leading-none text-rose-500/10 sm:text-[16rem]"
      >
        極
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl ring-1 ring-inset",
              unlocked
                ? "bg-rose-500/20 ring-rose-500/40"
                : "bg-rose-500/10 ring-rose-500/30",
            )}
          >
            {unlocked ? "⛩️" : <Crown className="size-6 text-rose-500" />}
          </span>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-300">
              <Crown className="size-3.5" />
              Grand milestone · N5 Master
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              The full N5 toolkit
            </h2>
            <p className="text-sm text-muted-foreground">
              Master every N5 kanji, 90% of kana, and three-quarters of N5
              vocab — all the way to SRS level 6.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-3xl font-bold tabular-nums">
              {pct.toFixed(1)}
              <span className="text-xl">%</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {unlocked ? "Unlocked" : "Path progress"}
            </div>
          </div>
          <ChevronRight className="size-5 text-rose-500/60 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <N5AxisBar
          label="N5 kanji mastered"
          icon="漢"
          current={kanji.current}
          target={kanji.target}
        />
        <N5AxisBar
          label="Kana mastered"
          icon="あ"
          current={kana.current}
          target={kana.target}
        />
        <N5AxisBar
          label="Vocab mastered"
          icon="語"
          current={vocab.current}
          target={vocab.target}
        />
      </div>

      <div className="relative mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600/80 transition-colors group-hover:text-rose-600 dark:text-rose-300/70 dark:group-hover:text-rose-300">
        Tap for the full path breakdown
        <ChevronRight className="size-3" />
      </div>
    </button>
  );

  return <N5MasteryModal trigger={trigger} snapshot={paths} />;
}

function ClosestToUnlockingCard({
  items,
}: {
  items: AchievementProgress[];
}) {
  // Surface the locked milestones the user is closest to claiming so
  // they get an at-a-glance "what's next?" tracker. We exclude 0%
  // entries (untouched goals would dominate the bottom of the list)
  // and cap at 6 — the rest live in the Locked tab below.
  const ranked = items
    .filter((a) => !a.unlocked && a.pct > 0)
    .sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      const remainingA = Math.max(0, a.goal - a.current);
      const remainingB = Math.max(0, b.goal - b.current);
      return remainingA - remainingB;
    })
    .slice(0, 6);

  if (ranked.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
            <Target className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Closest to unlocking
            </h2>
            <p className="text-xs text-muted-foreground">
              Live leaderboard of milestones you&apos;re actively chipping away
              at — ranked by completion.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {ranked.length} in progress
        </span>
      </div>

      <ol className="mt-4 space-y-2">
        {ranked.map((a, i) => {
          const remaining = Math.max(0, a.goal - a.current);
          return (
            <li
              key={a.id}
              className="grid grid-cols-[2rem_2.5rem_1fr_auto] items-center gap-3 rounded-xl border bg-card/60 px-3 py-2.5 transition-colors hover:bg-card"
            >
              <span className="text-center text-xs font-bold tabular-nums text-muted-foreground">
                #{i + 1}
              </span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-xl ring-1 ring-inset ring-amber-500/20">
                {a.icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{a.title}</h3>
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {a.current.toLocaleString()} / {a.goal.toLocaleString()}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {remaining === 0
                    ? "Ready to unlock — finish a quiz to claim it."
                    : `${remaining.toLocaleString()} to go · ${a.description}`}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
                    style={{ width: `${Math.max(2, a.pct)}%` }}
                  />
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                  a.pct >= 80
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : a.pct >= 50
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-border bg-muted text-muted-foreground",
                )}
              >
                {a.pct}%
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function N5AxisBar({
  label,
  icon,
  current,
  target,
}: {
  label: string;
  icon: string;
  current: number;
  target: number;
}) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
  const done = current >= target;
  return (
    <div className="rounded-xl border bg-card/70 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="jp flex size-7 items-center justify-center rounded-md bg-rose-500/15 text-base font-bold text-rose-600 dark:text-rose-300">
            {icon}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            done ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
          )}
        >
          {Math.min(current, target).toLocaleString()} /{" "}
          {target.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            done
              ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
              : "bg-gradient-to-r from-rose-400 to-orange-500",
          )}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}
