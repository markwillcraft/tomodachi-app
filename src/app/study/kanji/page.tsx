import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { KANJI_SECTIONS, N5_KANJI, getKanjiInSection } from "@/lib/kanji";
import { getKanjiProgress } from "@/lib/kanji-progress";
import { Badge } from "@/components/ui/badge";
import { KanjiSearch } from "@/components/kanji-search";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KanjiIndexPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { viewedToday, viewedEver } = await getKanjiProgress(userId);

  const total = N5_KANJI.length;
  const todayCount = N5_KANJI.filter((k) => viewedToday.has(k.char)).length;
  const everCount = N5_KANJI.filter((k) => viewedEver.has(k.char)).length;
  const todayPct = Math.round((todayCount / total) * 100);
  const everPct = Math.round((everCount / total) * 100);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/study"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Study
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold tracking-tight">N5 Kanji</h1>
            <Badge variant="outline">{total} characters</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            The full JLPT N5 kanji set, grouped the way native textbooks teach
            it. Tap any character to flip through meanings, hear the readings,
            and watch the stroke order draw itself.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="size-3" />
              Stroke order by KanjiVG
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <BookOpen className="size-3" />
              On'yomi + kun'yomi audio
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 self-start">
          <StatCard
            label="Studied today"
            value={todayCount}
            total={total}
            pct={todayPct}
            accent="from-emerald-500/20 to-teal-500/5 text-emerald-600 dark:text-emerald-300"
          />
          <StatCard
            label="Studied ever"
            value={everCount}
            total={total}
            pct={everPct}
            accent="from-violet-500/20 to-indigo-500/5 text-violet-600 dark:text-violet-300"
          />
        </div>
      </section>

      <KanjiSearch
        allKanji={N5_KANJI.map((k) => ({
          char: k.char,
          meaning: k.meaning,
          on: k.on,
          kun: k.kun,
        }))}
      />

      <div className="space-y-10">
        {KANJI_SECTIONS.map((section) => {
          const kanji = getKanjiInSection(section);
          const inSectionToday = kanji.filter((k) =>
            viewedToday.has(k.char),
          ).length;
          const inSectionEver = kanji.filter((k) =>
            viewedEver.has(k.char),
          ).length;
          return (
            <section key={section.id} className="space-y-4">
              <div
                className={cn(
                  "rounded-xl border bg-gradient-to-r p-4 sm:p-5",
                  section.accent.gradient,
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2
                      className={cn(
                        "text-xl font-bold tracking-tight sm:text-2xl",
                        section.accent.text,
                      )}
                    >
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {section.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="secondary"
                      className={cn(section.accent.chip)}
                    >
                      {inSectionToday}/{kanji.length} today
                    </Badge>
                    <Badge variant="outline">
                      {inSectionEver}/{kanji.length} ever
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {kanji.map((k) => {
                  const viewedTodayThis = viewedToday.has(k.char);
                  const viewedEverThis = viewedEver.has(k.char);
                  return (
                    <Link
                      key={k.char}
                      href={`/study/kanji/${encodeURIComponent(k.char)}`}
                      className={cn(
                        "group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-card p-3 transition-colors",
                        section.accent.ring,
                      )}
                      title={`${k.char} — ${k.meaning}`}
                    >
                      {viewedTodayThis && (
                        <span
                          className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 p-0.5 text-white"
                          aria-label="Viewed today"
                        >
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      )}
                      {!viewedTodayThis && viewedEverThis && (
                        <span
                          className="absolute right-1.5 top-1.5 rounded-full border border-muted-foreground/30 bg-background p-0.5 text-muted-foreground"
                          aria-label="Studied before"
                        >
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      )}
                      <span className="jp text-3xl font-bold text-foreground sm:text-4xl">
                        {k.char}
                      </span>
                      <span className="mt-1 line-clamp-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                        {k.meaning.split(",")[0]}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {k.strokes} strokes
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Stroke-order data courtesy of the{" "}
        <a
          href="https://kanjivg.tagaini.net/"
          target="_blank"
          rel="noreferrer noopener"
          className="underline hover:text-foreground"
        >
          KanjiVG
        </a>{" "}
        project (CC BY-SA 3.0).
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  pct,
  accent,
}: {
  label: string;
  value: number;
  total: number;
  pct: number;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4 shadow-sm",
        accent,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">/ {total}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-current transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
        {pct}%
      </div>
    </div>
  );
}
