"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  READING_STAGES,
  type ReadingSet,
  type ReadingStage,
} from "@/lib/reading";

// Stage 1..4 selector + today's-set strip + Start CTA. The parent
// resolves the user's local weekday on the server (no flash) and
// passes it down so this component can render the read-only "Today's
// set" badge on weekdays or the interactive 1..5 chip rail on
// weekends.
//
// On Start, navigates to /quiz/kana/reading?stage=N (and &set=M only
// on weekends — the play page derives weekday sets from the same
// helper the API uses).
export function ReadingStagePicker({
  weekdayLabel,
  autoSet,
}: {
  /** Pretty weekday label, e.g. "Wednesday". */
  weekdayLabel: string;
  /** Auto-released set 1..5 today (Mon..Fri), or null on Sat/Sun. */
  autoSet: ReadingSet | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<ReadingStage>(1);
  const isWeekend = autoSet === null;
  // On weekends, default to set 5 (Friday's set) so a returning
  // Saturday user is one tap away from playing the freshest set.
  const [manualSet, setManualSet] = useState<ReadingSet>(5);
  const [loading, setLoading] = useState(false);

  function start() {
    const params = new URLSearchParams({ stage: String(stage) });
    if (isWeekend) params.set("set", String(manualSet));
    setLoading(true);
    router.push(`/quiz/kana/reading?${params.toString()}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Choose your stage</CardTitle>
          <Badge variant="secondary">50 words per set</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {READING_STAGES.map((meta) => {
            const active = meta.stage === stage;
            return (
              <button
                key={meta.stage}
                type="button"
                onClick={() => setStage(meta.stage)}
                aria-pressed={active}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary/10 ring-2 ring-primary/40 ring-offset-0"
                    : "border-input bg-card hover:bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                    active
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {meta.stage}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {meta.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-dashed bg-muted/40 p-4">
          {isWeekend ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="size-3.5 text-muted-foreground" />
                Pick a set to review
                <span className="text-xs font-normal text-muted-foreground">
                  · Weekends let you replay any of the week's sets.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3, 4, 5] as ReadingSet[]).map((s) => {
                  const active = manualSet === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setManualSet(s)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-card text-foreground hover:bg-accent/50",
                      )}
                    >
                      Set {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="font-medium">
                Today's set · {autoSet} of 5
              </span>
              <span className="text-xs text-muted-foreground">
                · {weekdayLabel} — next set unlocks at midnight.
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button size="lg" onClick={start} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start {READING_STAGES[stage - 1].label}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
