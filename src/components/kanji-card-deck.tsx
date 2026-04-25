"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KanjiStrokeDisplay } from "@/components/kanji-stroke-display";
import { speakJapanese } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import {
  getSectionByKanji,
  type Kanji,
  type KanjiSection,
} from "@/lib/kanji";

export function KanjiCardDeck({
  kanji,
  initialIndex = 0,
  initialViewedChars = [],
}: {
  kanji: Kanji[];
  initialIndex?: number;
  initialViewedChars?: string[];
}) {
  const [index, setIndex] = useState(() => {
    if (!Number.isFinite(initialIndex)) return 0;
    return Math.max(0, Math.min(initialIndex, Math.max(0, kanji.length - 1)));
  });
  const [viewedChars, setViewedChars] = useState<Set<string>>(
    () => new Set(initialViewedChars),
  );
  const total = kanji.length;
  const current = kanji[index];
  const currentViewed = current ? viewedChars.has(current.char) : false;
  const section: KanjiSection | undefined = current
    ? getSectionByKanji(current.char)
    : undefined;

  const logView = useCallback(async (char: string) => {
    try {
      // `apiFetch` so the 25/50/100 kanji-per-day milestone (and any
      // daily quest the view completes) auto-dispatches its toast +
      // bell-refresh through the notification bus. Failures are
      // swallowed so a 429 / offline burst doesn't bubble into the
      // deck UI — view logging stays best-effort.
      await apiFetch("/api/kanji/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ char }),
      });
      setViewedChars((prev) => {
        if (prev.has(char)) return prev;
        const next = new Set(prev);
        next.add(char);
        return next;
      });
    } catch {
      // Silent — view logging is best-effort.
    }
  }, []);

  const speak = useCallback(
    (text: string, char?: string) => {
      speakJapanese(text);
      if (char) logView(char);
    },
    [logView],
  );

  // Log a view the first time we land on a kanji, so just browsing
  // through the deck registers progress even without audio playback.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => logView(current.char), 1200);
    return () => clearTimeout(t);
  }, [current, logView]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === "INPUT")
        return;
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(total - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if ((e.key === "p" || e.key === "P") && current) {
        const reading = current.on[0] ?? current.kun[0] ?? current.meaning;
        speak(reading, current.char);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, current, speak]);

  const progress = useMemo(() => {
    if (total === 0) return 0;
    return ((index + 1) / total) * 100;
  }, [index, total]);

  if (!current) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
        No kanji to study.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <ListOrdered className="size-3.5" />
            {index + 1} of {total}
          </span>
          <span className="hidden sm:inline">
            ← / → to navigate · P to play audio
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div
          className={cn(
            "relative rounded-2xl border-2 bg-card p-6 shadow-sm sm:p-10",
            section
              ? "border-transparent bg-gradient-to-br"
              : "border-border",
            section?.accent.gradient,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">N5</Badge>
              {section && (
                <Badge
                  variant="secondary"
                  className={cn("gap-1", section.accent.chip)}
                >
                  {section.title}
                </Badge>
              )}
              {currentViewed && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Studied today
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Play pronunciation"
              onClick={() =>
                speak(
                  current.on[0] ?? current.kun[0] ?? current.meaning,
                  current.char,
                )
              }
              className="size-10 p-0"
            >
              <Volume2 className="size-5" />
            </Button>
          </div>

          <div className="jp mt-4 text-9xl font-bold leading-none tracking-tight">
            {current.char}
          </div>
          <div className="mt-3 text-2xl text-muted-foreground">
            {current.meaning}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Reading
              label="On'yomi"
              caption="Sino-Japanese reading"
              readings={current.on}
              accent="text-rose-500 dark:text-rose-300"
              onPlay={(r) => speak(r, current.char)}
            />
            <Reading
              label="Kun'yomi"
              caption="Native Japanese reading"
              readings={current.kun}
              accent="text-cyan-600 dark:text-cyan-300"
              onPlay={(r) => speak(r, current.char)}
            />
          </div>

        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stroke order
            </div>
            <Badge variant="outline" className="text-[10px]">
              {current.strokes} strokes
            </Badge>
          </div>
          <KanjiStrokeDisplay
            char={current.char}
            totalStrokesHint={current.strokes}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Previous kanji"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <div className="flex-1" />
        <Button
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={index >= total - 1}
          aria-label="Next kanji"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Reading({
  label,
  caption,
  readings,
  accent,
  onPlay,
}: {
  label: string;
  caption: string;
  readings: string[];
  accent: string;
  onPlay: (r: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-background/60 p-3 backdrop-blur-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground/80">{caption}</div>
      {readings.length === 0 ? (
        <div className="mt-2 text-sm italic text-muted-foreground">
          (none common at N5)
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {readings.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onPlay(r)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-sm transition-colors hover:bg-accent/60",
                accent,
              )}
            >
              <Volume2 className="size-3 opacity-60" />
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
