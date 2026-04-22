"use client";

import { useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import type {
  AchievementCategory,
  AchievementProgress,
} from "@/lib/achievements";
import { cn } from "@/lib/utils";

type CategoryMeta = {
  label: string;
  blurb: string;
  tone: string;
  // Short label used inside the tab bar itself where we can't afford
  // long strings (e.g. "Grand milestones" → "Grand").
  short: string;
};

// "all" is a virtual category that flattens every section into one
// grid — useful as a default so users landing on the page see their
// highest-signal list first (pinned in-progress items).
type TabId = AchievementCategory | "all" | "unlocked" | "locked";

const CATEGORY_META: Record<AchievementCategory, CategoryMeta> = {
  milestone: {
    label: "Grand milestones",
    short: "Grand",
    blurb: "The big ones. Hard-won, end-of-path goals.",
    tone: "from-rose-500/15 via-background to-background",
  },
  streak: {
    label: "Streak",
    short: "Streak",
    blurb: "Show up every day.",
    tone: "from-orange-500/15 via-background to-background",
  },
  quiz: {
    label: "Quiz",
    short: "Quiz",
    blurb: "Volume, accuracy, perfection.",
    tone: "from-violet-500/15 via-background to-background",
  },
  study: {
    label: "Study",
    short: "Study",
    blurb: "Cards, kanji, the long game.",
    tone: "from-amber-500/15 via-background to-background",
  },
  mastery: {
    label: "Mastery",
    short: "Mastery",
    blurb: "Items locked into long-term memory.",
    tone: "from-sky-500/15 via-background to-background",
  },
  rewards: {
    label: "Rewards",
    short: "Rewards",
    blurb: "Your coin stash, over time.",
    tone: "from-emerald-500/15 via-background to-background",
  },
};

const CATEGORY_ORDER: AchievementCategory[] = [
  "milestone",
  "streak",
  "quiz",
  "study",
  "mastery",
  "rewards",
];

export function AchievementsTabs({ items }: { items: AchievementProgress[] }) {
  const byCategory = useMemo(() => {
    const map = new Map<AchievementCategory, AchievementProgress[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const a of items) {
      const list = map.get(a.category);
      if (list) list.push(a);
    }
    return map;
  }, [items]);

  const unlocked = items.filter((a) => a.unlocked);
  const locked = items.filter((a) => !a.unlocked);

  const [tab, setTab] = useState<TabId>("all");

  // Sort category tabs by the user's actual progress: most-unlocked
  // categories surface first so the page opens with the most satisfying
  // signal up top. Ties break on *total* size (bigger catalog first),
  // then on the authored CATEGORY_ORDER so we don't reshuffle randomly
  // when everything sits at zero.
  const categoryTabs = CATEGORY_ORDER.filter(
    (c) => (byCategory.get(c) ?? []).length > 0,
  )
    .map((c) => {
      const list = byCategory.get(c) ?? [];
      return {
        id: c as TabId,
        label: CATEGORY_META[c].label,
        short: CATEGORY_META[c].short,
        count: list.length,
        unlockedCount: list.filter((a) => a.unlocked).length,
        authoredIdx: CATEGORY_ORDER.indexOf(c),
      };
    })
    .sort((a, b) => {
      if (b.unlockedCount !== a.unlockedCount) {
        return b.unlockedCount - a.unlockedCount;
      }
      if (b.count !== a.count) return b.count - a.count;
      return a.authoredIdx - b.authoredIdx;
    });

  const tabs: Array<{
    id: TabId;
    label: string;
    short: string;
    count: number;
    unlockedCount: number;
  }> = [
    {
      id: "all",
      label: "All",
      short: "All",
      count: items.length,
      unlockedCount: unlocked.length,
    },
    ...categoryTabs.map(({ authoredIdx: _authoredIdx, ...t }) => t),
    {
      id: "unlocked",
      label: "Unlocked",
      short: "Unlocked",
      count: unlocked.length,
      unlockedCount: unlocked.length,
    },
    {
      id: "locked",
      label: "Locked",
      short: "Locked",
      count: locked.length,
      unlockedCount: 0,
    },
  ];

  const visible = useMemo(() => {
    if (tab === "all") return items;
    if (tab === "unlocked") return unlocked;
    if (tab === "locked") return locked;
    return byCategory.get(tab) ?? [];
  }, [tab, items, unlocked, locked, byCategory]);

  const activeMeta =
    tab === "all"
      ? {
          label: "All milestones",
          blurb: "Every milestone across every category.",
          tone: "from-amber-500/10 via-background to-background",
        }
      : tab === "unlocked"
        ? {
            label: "Unlocked",
            blurb: "Your hall of fame — milestones you've already claimed.",
            tone: "from-emerald-500/15 via-background to-background",
          }
        : tab === "locked"
          ? {
              label: "Still to come",
              blurb: "Locked milestones, sorted by how close you are.",
              tone: "from-slate-500/10 via-background to-background",
            }
          : CATEGORY_META[tab];

  // For the "locked" tab we sort by completion % descending so the
  // almost-there ones surface first (best possible "nudge"). For all
  // others we keep the catalog's authored order so tiers read naturally.
  const sortedVisible = useMemo(() => {
    if (tab !== "locked") return visible;
    return [...visible].sort((a, b) => b.pct - a.pct);
  }, [tab, visible]);

  return (
    <section className="space-y-4">
      <div
        className="sticky top-0 z-10 -mx-4 overflow-x-auto bg-background/80 px-4 pb-2 pt-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
        role="tablist"
        aria-label="Achievement categories"
      >
        <div className="flex min-w-max items-center gap-1.5 sm:flex-wrap">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "border-amber-500/60 bg-amber-500/15 text-foreground shadow-sm"
                    : "border-border bg-card/40 text-muted-foreground hover:border-foreground/20 hover:bg-card hover:text-foreground",
                )}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-amber-500/25 text-amber-800 dark:text-amber-100"
                      : "bg-muted text-muted-foreground/80",
                  )}
                >
                  {t.unlockedCount}
                  <span className="opacity-60">/</span>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 rounded-xl border bg-gradient-to-br px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
          activeMeta.tone,
        )}
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {activeMeta.label}
          </h2>
          <p className="text-xs text-muted-foreground">{activeMeta.blurb}</p>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {sortedVisible.filter((a) => a.unlocked).length} /{" "}
          {sortedVisible.length} unlocked
        </span>
      </div>

      {sortedVisible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedVisible.map((a) => (
            <AchievementCard key={a.id} ach={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ tab }: { tab: TabId }) {
  const msg =
    tab === "unlocked"
      ? "You haven't unlocked any milestones yet. Take a quiz or study some cards to get started!"
      : tab === "locked"
        ? "Every milestone in this filter has been claimed. Nice work!"
        : "Nothing tracked in this category yet.";
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="size-4" />
      </span>
      <div>{msg}</div>
    </div>
  );
}

function AchievementCard({ ach }: { ach: AchievementProgress }) {
  const locked = !ach.unlocked;
  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        locked
          ? "bg-muted/30"
          : "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl ring-1 ring-inset",
            locked
              ? "bg-muted text-muted-foreground ring-border grayscale"
              : "bg-amber-500/15 ring-amber-500/30",
          )}
        >
          {locked ? <Lock className="size-5" /> : ach.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className={cn(
                "truncate text-sm font-semibold",
                locked ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {ach.title}
            </h3>
            {!locked && (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                Unlocked
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {ach.description}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>
            {Math.min(ach.current, ach.goal).toLocaleString()} /{" "}
            {ach.goal.toLocaleString()}
          </span>
          <span>{ach.pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              locked
                ? "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60"
                : "bg-gradient-to-r from-amber-400 to-orange-500",
            )}
            style={{ width: `${Math.max(2, ach.pct)}%` }}
          />
        </div>
        {ach.unlocked && ach.unlockedAt && (
          <p className="text-[10px] text-muted-foreground">
            Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </article>
  );
}
