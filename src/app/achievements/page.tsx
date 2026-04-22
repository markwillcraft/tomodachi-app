import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Crown, Sparkles, Trophy } from "lucide-react";
import {
  getAchievementsProgress,
  type N5Snapshot,
} from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { AchievementsTabs } from "./achievements-tabs";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { items, unlockedCount, totalCount, n5 } =
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

      <N5GrandCard snapshot={n5} />

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

function N5GrandCard({ snapshot }: { snapshot: N5Snapshot }) {
  const { kanji, kana, vocab, pct } = snapshot;
  const unlocked = pct >= 100;
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
        unlocked
          ? "border-rose-500/50 bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-card"
          : "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card",
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
              Master every kanji, most kana, and 200+ vocab — all the way to
              SRS level 6.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">{pct}%</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {unlocked ? "Unlocked" : "Path progress"}
          </div>
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
