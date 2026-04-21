import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock,
  Layers,
  MapPin,
  Palette,
  Smile,
  Sparkles,
  User,
  Users,
  Utensils,
  HandHeart,
  Hash,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCategoriesByLevel } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tone = "violet" | "emerald" | "amber" | "rose" | "sky" | "fuchsia";

const TONE: Record<
  Tone,
  {
    gradient: string;
    iconWrap: string;
    chip: string;
    hover: string;
    bar: string;
    kanji: string;
  }
> = {
  violet: {
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    iconWrap:
      "bg-violet-500/15 text-violet-600 dark:text-violet-300 ring-violet-500/30",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    hover: "group-hover:border-violet-400/60 group-hover:shadow-violet-500/10",
    bar: "bg-violet-500",
    kanji: "text-violet-500/10 dark:text-violet-300/10",
  },
  emerald: {
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    iconWrap:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    hover:
      "group-hover:border-emerald-400/60 group-hover:shadow-emerald-500/10",
    bar: "bg-emerald-500",
    kanji: "text-emerald-500/10 dark:text-emerald-300/10",
  },
  amber: {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    iconWrap:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    hover: "group-hover:border-amber-400/60 group-hover:shadow-amber-500/10",
    bar: "bg-amber-500",
    kanji: "text-amber-500/10 dark:text-amber-300/10",
  },
  rose: {
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
    iconWrap:
      "bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/30",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    hover: "group-hover:border-rose-400/60 group-hover:shadow-rose-500/10",
    bar: "bg-rose-500",
    kanji: "text-rose-500/10 dark:text-rose-300/10",
  },
  sky: {
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/30",
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    hover: "group-hover:border-sky-400/60 group-hover:shadow-sky-500/10",
    bar: "bg-sky-500",
    kanji: "text-sky-500/10 dark:text-sky-300/10",
  },
  fuchsia: {
    gradient: "from-fuchsia-500/15 via-fuchsia-500/5 to-transparent",
    iconWrap:
      "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 ring-fuchsia-500/30",
    chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
    hover:
      "group-hover:border-fuchsia-400/60 group-hover:shadow-fuchsia-500/10",
    bar: "bg-fuchsia-500",
    kanji: "text-fuchsia-500/10 dark:text-fuchsia-300/10",
  },
};

// Per-category visual identity. Icon + tone + a single kanji watermark
// that captures the topic. Keyed by slug so adding a new category is a
// one-line fallback instead of hard-breaking the page.
const CATEGORY_VISUALS: Record<
  string,
  { icon: LucideIcon; tone: Tone; kanji: string }
> = {
  "n5-greetings": { icon: HandHeart, tone: "rose", kanji: "挨" },
  "n5-numbers": { icon: Hash, tone: "violet", kanji: "数" },
  "n5-days-and-time": { icon: Clock, tone: "sky", kanji: "時" },
  "n5-family": { icon: Users, tone: "rose", kanji: "家" },
  "n5-colors": { icon: Palette, tone: "fuchsia", kanji: "色" },
  "n5-food-and-drink": { icon: Utensils, tone: "amber", kanji: "食" },
  "n5-places": { icon: MapPin, tone: "sky", kanji: "所" },
  "n5-verbs": { icon: Zap, tone: "emerald", kanji: "動" },
  "n5-adjectives": { icon: Sparkles, tone: "violet", kanji: "形" },
  "n5-pronouns-and-people": { icon: User, tone: "amber", kanji: "人" },
};

const DEFAULT_VISUAL = {
  icon: Layers,
  tone: "violet" as Tone,
  kanji: "類",
};

export default async function CategoriesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const categories = getCategoriesByLevel("N5");

  const owned = await prisma.word.findMany({
    where: { userId },
    select: { romaji: true },
  });
  const ownedSet = new Set(owned.map((w) => w.romaji.toLowerCase()));

  const totalWords = categories.reduce((s, c) => s + c.words.length, 0);
  const totalAdded = categories.reduce(
    (s, c) =>
      s +
      c.words.filter((w) => ownedSet.has(w.romaji.toLowerCase())).length,
    0,
  );
  const overallPct =
    totalWords === 0 ? 0 : Math.round((totalAdded / totalWords) * 100);
  const completedCount = categories.filter((c) =>
    c.words.every((w) => ownedSet.has(w.romaji.toLowerCase())),
  ).length;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-10 select-none text-[10rem] font-bold leading-none text-primary/5 sm:text-[14rem]"
        >
          類
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
            <Layers className="size-3.5" />
            Catalog · N5
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Build your vocab by topic
          </h1>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            Curated N5 vocabulary, grouped by theme. Tap a category to preview
            the words, then add any (or all) of them to your personal vocab
            with one tap.
          </p>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-card/70 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {totalAdded}
              </span>
              <span className="text-sm text-muted-foreground">
                / {totalWords} N5 words added
              </span>
            </div>
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                <span>{overallPct}% complete</span>
                <span>
                  {completedCount} / {categories.length} categories done
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const total = c.words.length;
          const added = c.words.filter((w) =>
            ownedSet.has(w.romaji.toLowerCase()),
          ).length;
          const pct = total === 0 ? 0 : Math.round((added / total) * 100);
          const v = CATEGORY_VISUALS[c.slug] ?? DEFAULT_VISUAL;
          const tone = TONE[v.tone];
          const Icon = v.icon;
          const done = added === total && total > 0;

          return (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="group block"
            >
              <article
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
                  "group-hover:-translate-y-0.5 group-hover:shadow-lg",
                  tone.hover,
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    tone.gradient,
                  )}
                />
                <div
                  aria-hidden
                  className={cn(
                    "jp pointer-events-none absolute -right-3 -bottom-6 select-none text-[7rem] font-bold leading-none transition-transform duration-300 group-hover:scale-105",
                    tone.kanji,
                  )}
                >
                  {v.kanji}
                </div>

                <div className="relative flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
                        tone.iconWrap,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                        <Check className="size-3" />
                        Complete
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                          tone.chip,
                        )}
                      >
                        {total} words
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {c.name}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {c.description}
                    </p>
                  </div>

                  <div className="mt-auto space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                      <span>
                        {added} / {total} added
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full transition-all", tone.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 pt-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      Browse words
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <section className="flex items-start gap-3 rounded-xl border bg-gradient-to-r from-sky-500/5 via-muted/30 to-transparent p-5 text-sm text-muted-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-500 dark:text-sky-300">
          <Sparkles className="size-4" />
        </span>
        <div>
          <strong className="text-foreground">Coming soon:</strong> N4 and N3
          categories. For now, focus on completing the N5 topics above — they
          cover the ~800 words you need for the JLPT N5 exam.
        </div>
      </section>
    </div>
  );
}
