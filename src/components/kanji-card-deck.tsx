"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KanjiStrokeDisplay } from "@/components/kanji-stroke-display";
import { speakJapanese } from "@/lib/speech";
import type { Kanji } from "@/lib/kanji";

export function KanjiCardDeck({ kanji }: { kanji: Kanji[] }) {
  const [index, setIndex] = useState(0);
  const total = kanji.length;
  const current = kanji[index];

  // Keyboard nav, mirrors the vocab study UX.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if ((e.key === "p" || e.key === "P") && current) {
        const reading = current.on[0] ?? current.kun[0] ?? current.meaning;
        speakJapanese(reading);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, current]);

  if (!current) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
        No kanji to study.
      </div>
    );
  }

  function speak(text: string) {
    speakJapanese(text);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {index + 1} / {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous kanji"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="sm"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index >= total - 1}
            aria-label="Next kanji"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="rounded-2xl border-2 bg-card p-6 sm:p-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="outline">N5</Badge>
              <div className="jp mt-3 text-9xl font-bold leading-none">
                {current.char}
              </div>
              <div className="mt-3 text-2xl text-muted-foreground">
                {current.meaning}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Play pronunciation"
              onClick={() =>
                speak(current.on[0] ?? current.kun[0] ?? current.meaning)
              }
              className="size-10 p-0"
            >
              <Volume2 className="size-5" />
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Reading
              label="On'yomi"
              caption="Sino-Japanese reading"
              readings={current.on}
              accent="text-pink-400"
              onPlay={(r) => speak(r)}
            />
            <Reading
              label="Kun'yomi"
              caption="Native Japanese reading"
              readings={current.kun}
              accent="text-cyan-300"
              onPlay={(r) => speak(r)}
            />
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>{current.strokes} strokes</span>
            <span>← / → to navigate · P to play</span>
          </div>
        </div>

        <div className="rounded-2xl border-2 bg-card p-4 sm:p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stroke order
          </div>
          <KanjiStrokeDisplay
            char={current.char}
            totalStrokesHint={current.strokes}
          />
        </div>
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
    <div className="rounded-lg border bg-background/40 p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{caption}</div>
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
              className={
                "rounded-md border px-2 py-1 font-mono text-sm hover:bg-accent/40 " +
                accent
              }
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
