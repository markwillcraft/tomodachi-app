"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brush,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Headphones,
  Languages,
  Lightbulb,
  Lock,
  Mic,
  PenLine,
  ScrollText,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  N5PathId,
  N5PathItem,
  N5PathProgress,
  N5PathsSnapshot,
  PathTone,
} from "@/lib/n5-paths";

const TONE_BG: Record<PathTone, string> = {
  violet:
    "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  emerald:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  slate:
    "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const TONE_BAR: Record<PathTone, string> = {
  violet: "from-violet-400 to-violet-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-rose-600",
  sky: "from-sky-400 to-sky-600",
  slate: "from-slate-400 to-slate-600",
};

const TONE_BORDER: Record<PathTone, string> = {
  violet: "border-violet-500/30",
  emerald: "border-emerald-500/30",
  amber: "border-amber-500/30",
  rose: "border-rose-500/30",
  sky: "border-sky-500/30",
  slate: "border-slate-500/30",
};

// Map path id → header icon. Kept here (not in n5-paths.ts) so the
// lib stays free of React imports.
const PATH_ICON: Record<
  N5PathId,
  React.ComponentType<{ className?: string }>
> = {
  kana: Languages,
  kanji: Brush,
  vocab: ScrollText,
  grammar: Lightbulb,
  listening: Headphones,
  writing: PenLine,
  speaking: Mic,
};

// =====================================================================
// Mastery buckets
// ---------------------------------------------------------------------
// "Started" is a synthetic bucket — it isn't a real SRS level. It
// represents items the user has *studied* (kana table tap, vocab
// flip, kanji study tap) but never quizzed on. We surface it here
// so progression feels continuous: Not started → Started → L1+.
// Internally this stays separate from the 1..6 SRS levels so the
// SRS math is unaffected.
//
// Bucket key conventions used by the legend / filter / item badge:
//   "untouched" → level === 0 && !started
//   "started"   → level === 0 && started
//   1..6        → SRS level
// =====================================================================
type BucketKey = "untouched" | "started" | 1 | 2 | 3 | 4 | 5 | 6;

const BUCKET_META: Record<
  BucketKey,
  { label: string; description: string; tone: BucketTone }
> = {
  untouched: {
    label: "Not started",
    description: "Hasn't appeared in a quiz or been studied yet.",
    tone: "slate",
  },
  started: {
    label: "Started",
    description:
      "You've studied this in the kana table / vocab / kanji deck. Quiz it to start climbing the SRS ladder.",
    tone: "teal",
  },
  1: {
    label: "L1 · New",
    description: "Seen once — fresh in memory.",
    tone: "rose",
  },
  2: {
    label: "L2 · Learning",
    description: "A few correct answers; still shaky.",
    tone: "orange",
  },
  3: {
    label: "L3 · Reviewing",
    description: "Building up reviews on a short interval.",
    tone: "amber",
  },
  4: {
    label: "L4 · Familiar",
    description: "Recalled reliably across longer gaps.",
    tone: "sky",
  },
  5: {
    label: "L5 · Confident",
    description: "Confident — only an occasional refresh.",
    tone: "violet",
  },
  6: {
    label: "L6 · Mastered",
    description: "Long-term memory — a true win.",
    tone: "emerald",
  },
};

const BUCKET_ORDER: BucketKey[] = ["untouched", "started", 1, 2, 3, 4, 5, 6];

type BucketTone =
  | "slate"
  | "teal"
  | "rose"
  | "orange"
  | "amber"
  | "sky"
  | "violet"
  | "emerald";

type BucketStyle = { chip: string; badge: string; ring: string; dot: string };

const BUCKET_STYLE: Record<BucketTone, BucketStyle> = {
  slate: {
    chip: "border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-300",
    badge:
      "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
    ring: "border-slate-400/30 bg-muted/40 text-muted-foreground ring-slate-400/20",
    dot: "bg-slate-400",
  },
  teal: {
    chip: "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    ring: "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-teal-500/30",
    dot: "bg-teal-500",
  },
  rose: {
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    ring: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30",
    dot: "bg-rose-500",
  },
  orange: {
    chip: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    badge:
      "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    ring: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/30",
    dot: "bg-orange-500",
  },
  amber: {
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    ring: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    dot: "bg-amber-500",
  },
  sky: {
    chip: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    ring: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/30",
    dot: "bg-sky-500",
  },
  violet: {
    chip: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    badge:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    ring: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/30",
    dot: "bg-violet-500",
  },
  emerald: {
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ring: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
};

function bucketFor(item: N5PathItem): BucketKey {
  if (item.level >= 1) return Math.min(6, item.level) as BucketKey;
  if (item.started) return "started";
  return "untouched";
}

type Filter = "all" | BucketKey;

const PAGE_SIZE = 30;

export function N5MasteryModal({
  trigger,
  snapshot,
}: {
  trigger: React.ReactNode;
  snapshot: N5PathsSnapshot;
}) {
  const [open, setOpen] = useState(false);

  // Default tab: first live path, falling back to the first one if
  // everything is coming-soon (shouldn't happen with current config).
  const initialTab =
    snapshot.paths.find((p) => !p.comingSoon)?.id ??
    snapshot.paths[0]?.id ??
    "kana";
  const [tab, setTab] = useState<N5PathId>(initialTab);
  const active = snapshot.paths.find((p) => p.id === tab) ?? snapshot.paths[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-hidden p-0 sm:w-full">
        <div className="flex max-h-[90vh] min-w-0 flex-col">
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-background px-4 py-4 sm:px-6 sm:py-5">
            <div
              aria-hidden
              className="jp pointer-events-none absolute -right-2 -top-8 select-none text-[8rem] font-bold leading-none text-rose-500/10 sm:text-[10rem]"
            >
              極
            </div>
            <div className="relative flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-2xl ring-1 ring-inset ring-rose-500/40">
                <Crown className="size-5 text-rose-500" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-300">
                  N5 Master · Path tracker
                </div>
                <DialogTitle className="mt-0.5 text-lg font-bold tracking-tight sm:text-2xl">
                  Your N5 toolkit
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs sm:text-sm">
                  Tap any tab to see exactly which items you&apos;ve mastered,
                  which are in progress, and which are still untouched.
                </DialogDescription>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <div className="text-3xl font-bold tabular-nums">
                  {snapshot.grandPct.toFixed(1)}
                  <span className="text-xl">%</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Path total
                </div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div
            className="shrink-0 overflow-x-auto border-b bg-card/60 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="N5 mastery paths"
          >
            <div className="flex min-w-max items-center gap-1.5">
              {snapshot.paths.map((p) => {
                const isActive = p.id === tab;
                const Icon = PATH_ICON[p.id] ?? Sparkles;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(p.id)}
                    className={cn(
                      "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "border-rose-500/60 bg-rose-500/15 text-foreground shadow-sm"
                        : p.comingSoon
                          ? "border-dashed border-border bg-card/40 text-muted-foreground/70 hover:border-foreground/20 hover:text-muted-foreground"
                          : "border-border bg-card/40 text-muted-foreground hover:border-foreground/20 hover:bg-card hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{p.shortLabel}</span>
                    {p.comingSoon ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/80">
                        Soon
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                          isActive
                            ? "bg-rose-500/25 text-rose-800 dark:text-rose-100"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.mastered}/{p.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-5 pt-4 sm:px-6">
            {active && <PathPanel path={active} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PathPanel({ path }: { path: N5PathProgress }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  // Bucket items by SRS level / studied state so legend chips can
  // show counts and the filter step is just a Map lookup instead of
  // re-iterating.
  const buckets = useMemo(() => {
    const out = new Map<BucketKey, N5PathItem[]>();
    for (const k of BUCKET_ORDER) out.set(k, []);
    for (const item of path.items) {
      const k = bucketFor(item);
      const arr = out.get(k);
      if (arr) arr.push(item);
    }
    return out;
  }, [path.items]);

  const filtered = useMemo(() => {
    if (filter === "all") return path.items;
    return buckets.get(filter) ?? [];
  }, [filter, buckets, path.items]);

  // Reset to page 1 whenever the filter or the active path changes.
  // Without this, switching from a filter with 100 items to a filter
  // with 5 items would leave the user on page 4 of nothing.
  useEffect(() => {
    setPage(1);
  }, [filter, path.id]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice(pageStart, pageEnd);

  if (path.comingSoon) {
    return <ComingSoonState path={path} />;
  }

  const remaining = Math.max(0, path.goal - path.mastered);
  const startedCount = buckets.get("started")?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Mastered"
          value={path.mastered.toString()}
          tone={path.tone}
        />
        <Stat
          label="In progress"
          value={(path.seen - path.mastered).toString()}
          tone="amber"
        />
        <Stat
          label="Started"
          value={startedCount.toString()}
          tone="sky"
        />
        <Stat
          label="Goal"
          value={`${path.mastered} / ${path.goal}`}
          tone="rose"
        />
      </div>

      <div className="rounded-xl border bg-card/60 p-3">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium text-foreground">
            {path.label} progress
          </span>
          <span className="tabular-nums text-muted-foreground">
            {path.pct.toFixed(1)}% {remaining > 0 && `· ${remaining} to go`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
              TONE_BAR[path.tone],
            )}
            style={{ width: `${Math.max(2, path.pct)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{path.description}</p>
      </div>

      {/* SRS color legend (also acts as filter chips) */}
      <div className="rounded-xl border bg-card/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mastery levels
          </h4>
          <span className="text-[10px] text-muted-foreground">
            Tap a chip to filter
          </span>
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">View or listen</span> to
          tag an item as <span className="font-medium text-teal-600 dark:text-teal-300">Started</span>
          . Items only level up{" "}
          <span className="font-medium text-foreground">L1 → L6</span> when you
          answer them correctly in a quiz.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={path.items.length}
            dotClassName="bg-foreground/40"
            tone="border-foreground/40 bg-foreground/10 text-foreground"
          />
          {BUCKET_ORDER.map((key) => {
            const meta = BUCKET_META[key];
            const style = BUCKET_STYLE[meta.tone];
            const count = buckets.get(key)?.length ?? 0;
            return (
              <FilterChip
                key={String(key)}
                active={filter === key}
                onClick={() => setFilter(key)}
                label={meta.label}
                count={count}
                dotClassName={style.dot}
                tone={style.chip}
                disabled={count === 0}
                title={meta.description}
              />
            );
          })}
        </div>
      </div>

      {/* Item list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 py-8 text-center">
          <Sparkles className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">No items at this level</span>
          <span className="text-xs text-muted-foreground">
            Try a different filter chip above.
          </span>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border">
            <ul className="divide-y">
              {pageItems.map((item) => {
                const key = bucketFor(item);
                const meta = BUCKET_META[key];
                const style = BUCKET_STYLE[meta.tone];
                return (
                  <li
                    key={item.key}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg border text-base font-bold ring-1 ring-inset",
                        style.ring,
                      )}
                    >
                      <span className="jp">{item.label}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.label}
                        </span>
                        {item.mastered && (
                          <Trophy className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      {item.sub && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.sub}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                        style.badge,
                      )}
                      title={meta.description}
                    >
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              from={pageStart + 1}
              to={pageEnd}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border bg-card/60 px-2 py-1 transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" />
          Prev
        </button>
        <span className="px-2 tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-md border bg-card/60 px-2 py-1 transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dotClassName,
  tone,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotClassName: string;
  tone: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all",
        active
          ? cn("ring-1 ring-foreground/30", tone)
          : "border-border bg-card/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:border-border",
      )}
    >
      <span
        className={cn(
          "inline-block size-2 shrink-0 rounded-full",
          dotClassName,
        )}
      />
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
          active ? "bg-background/40" : "bg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ComingSoonState({ path }: { path: N5PathProgress }) {
  const Icon = PATH_ICON[path.id] ?? Sparkles;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-center sm:p-8">
        <span
          className={cn(
            "mx-auto flex size-12 items-center justify-center rounded-xl ring-1 ring-inset",
            TONE_BG[path.tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Lock className="size-3" />
          Coming soon
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight">
          {path.label}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {path.description}
        </p>
        <div className="mx-auto mt-4 max-w-md rounded-lg border bg-card/60 p-3 text-left text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <ChevronRight className="size-3.5" />
            <span className="font-medium">
              Reserved slot in the N5 path tracker
            </span>
          </div>
          <p className="mt-1 leading-relaxed">
            We&apos;re wiring this axis up so it counts toward your N5 grand
            achievement once the feature ships. Until then it sits at 0% with
            no impact on your overall path progress.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card/40 p-4">
        <h4 className="text-sm font-semibold">What we&apos;re planning</h4>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {PLAN_NOTES[path.id]?.map((note, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500/70" />
              <span>{note}</span>
            </li>
          )) ?? null}
        </ul>
      </div>
    </div>
  );
}

const PLAN_NOTES: Partial<Record<N5PathId, string[]>> = {
  grammar: [
    "Track each N5 grammar lesson with a mini-quiz (fill-in-the-blank + sentence build).",
    "Roll grammar mastery into the same SRS schedule as kana/kanji/vocab.",
    "Surface the lesson in this list with a level badge once you've answered it.",
  ],
  listening: [
    "Native-audio prompts where you transcribe what you hear.",
    "Mastery scored by accuracy + how quickly you nail the answer.",
  ],
  writing: [
    "Stroke-order traces for kanji and short sentence composition prompts.",
    "Mastery counts when your output matches the target characters.",
  ],
  speaking: [
    "Shadowing drills with playback and pitch-accent hints.",
    "Mastery scored via local mic input (no audio leaves your device).",
  ],
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: PathTone;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border bg-card/60 p-3",
        TONE_BORDER[tone],
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-xl font-bold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
