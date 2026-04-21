"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Repeat,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { speakJapanese } from "@/lib/speech";

export type StudyWord = {
  id: number;
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  batchName?: string | null;
};


export function StudyCardDeck({
  words,
  initialViewedIds,
  dailyCardGoal,
}: {
  words: StudyWord[];
  initialViewedIds: number[];
  dailyCardGoal: number;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewed, setViewed] = useState<Set<number>>(
    () => new Set(initialViewedIds),
  );
  const [logging, setLogging] = useState(false);
  const seenThisSession = useRef<Set<number>>(new Set(initialViewedIds));

  const total = words.length;
  const current: StudyWord | undefined = words[index];

  // Keyboard nav: ←/→ to move, space to flip, P to play audio.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === "p" || e.key === "P") {
        if (current) speak(current.hiragana);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current]);

  function speak(text: string) {
    speakJapanese(text);
  }

  async function logView(wordId: number) {
    if (seenThisSession.current.has(wordId)) return;
    seenThisSession.current.add(wordId);
    setLogging(true);
    try {
      await fetch("/api/cards/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId }),
      });
      setViewed((prev) => {
        const n = new Set(prev);
        n.add(wordId);
        return n;
      });
    } catch {
      // Best-effort. Streak can recover on the next view.
      seenThisSession.current.delete(wordId);
    } finally {
      setLogging(false);
    }
  }

  function next() {
    if (!current) return;
    void logView(current.id);
    if (index + 1 < total) {
      setIndex(index + 1);
      setFlipped(false);
    }
  }

  function prev() {
    if (index > 0) {
      setIndex(index - 1);
      setFlipped(false);
    }
  }

  function flip() {
    setFlipped((f) => !f);
    if (current) void logView(current.id);
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
        No words to study yet. Add some from{" "}
        <a href="/import" className="underline">
          Import
        </a>{" "}
        or{" "}
        <a href="/categories" className="underline">
          N5 Categories
        </a>
        .
      </div>
    );
  }

  if (!current) return null;

  const todayCount = viewed.size;
  const pct = Math.min(100, Math.round((todayCount / dailyCardGoal) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Card {index + 1} / {total}
          {current.batchName && (
            <Badge variant="outline" className="ml-3">
              {current.batchName}
            </Badge>
          )}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Today: </span>
          <span className="font-semibold">
            {todayCount}/{dailyCardGoal}
          </span>{" "}
          <span className="text-muted-foreground">cards viewed ({pct}%)</span>
          {logging && (
            <Loader2 className="ml-2 inline size-3 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={flip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}
        className={cn(
          "group relative mx-auto flex min-h-[320px] w-full max-w-2xl cursor-pointer select-none flex-col items-center justify-center rounded-2xl border-2 p-10 text-center shadow-sm transition-all",
          flipped
            ? "border-primary/40 bg-gradient-to-br from-primary/5 to-accent/30"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        {!flipped ? (
          <>
            <Badge variant="outline" className="absolute left-4 top-4">
              Romaji
            </Badge>
            <div className="text-5xl font-bold tracking-tight sm:text-6xl">
              {capitalize(current.romaji)}
            </div>
            <div className="mt-6 text-sm text-muted-foreground">
              Tap card or press space to flip
            </div>
          </>
        ) : (
          <>
            <Badge variant="secondary" className="absolute left-4 top-4">
              Translation
            </Badge>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Hiragana
                </div>
                <div className="jp text-5xl font-bold sm:text-6xl">
                  {current.hiragana}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-left">
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs uppercase text-muted-foreground">
                    Katakana
                  </div>
                  <div className="jp mt-1 text-2xl">{current.katakana}</div>
                </div>
                <div className="rounded-lg border bg-background/50 p-3">
                  <div className="text-xs uppercase text-muted-foreground">
                    English
                  </div>
                  <div className="mt-1 text-base">
                    {current.english || (
                      <span className="text-muted-foreground italic">
                        no translation
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <Button
          size="sm"
          variant="ghost"
          aria-label="Play pronunciation"
          onClick={(e) => {
            e.stopPropagation();
            speak(current.hiragana);
            void logView(current.id);
          }}
          className="absolute right-3 top-3 size-10 p-0"
        >
          <Volume2 className="size-5" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous card"
        >
          <ChevronLeft />
          Prev
        </Button>
        <Button variant="ghost" onClick={() => setFlipped((f) => !f)}>
          <Repeat />
          Flip
        </Button>
        <Button onClick={next} disabled={index + 1 >= total}>
          Next
          <ChevronRight />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Shortcuts: ← / → to navigate, space to flip, P to play audio
      </p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
