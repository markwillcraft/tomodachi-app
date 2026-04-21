"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kanjiVgUrl } from "@/lib/kanji";

// Renders a stroke-order viewer for a single kanji using a KanjiVG SVG.
// Strokes appear sequentially as the user steps (or auto-plays) forward,
// with a 1-based number on the active stroke so they can follow along.
export function KanjiStrokeDisplay({
  char,
  totalStrokesHint,
}: {
  char: string;
  totalStrokesHint?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [paths, setPaths] = useState<SVGPathElement[]>([]);
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset when switching characters.
  useEffect(() => {
    setStep(1);
    setPlaying(false);
    setPaths([]);
    setError(null);
    setLoading(true);
  }, [char]);

  // Fetch SVG and inject into our container so we get real DOM nodes for
  // each stroke path (which lets us toggle visibility one by one).
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(kanjiVgUrl(char), { signal: ctrl.signal });
        if (!res.ok) throw new Error(`KanjiVG ${res.status}`);
        const text = await res.text();
        if (!containerRef.current) return;
        // Strip the XML prolog and inject as inline SVG.
        const cleaned = text.replace(/<\?xml[^?]*\?>/, "").trim();
        containerRef.current.innerHTML = cleaned;
        const svg = containerRef.current.querySelector("svg");
        if (svg) {
          svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
          svg.setAttribute("width", "100%");
          svg.setAttribute("height", "100%");
          svg.removeAttribute("style");
        }
        // Stroke paths in KanjiVG live under groups whose ids start with
        // "kvg:StrokePaths_". Each <path> is one stroke in stroke order.
        const collected = Array.from(
          containerRef.current.querySelectorAll("path"),
        ) as SVGPathElement[];
        for (const p of collected) {
          p.setAttribute("stroke", "currentColor");
          p.setAttribute("fill", "none");
          p.setAttribute("stroke-linecap", "round");
          p.setAttribute("stroke-linejoin", "round");
          p.setAttribute("stroke-width", "3");
        }
        // Hide the numeric stroke labels that ship in KanjiVG; we render our
        // own number badge instead so it can be styled with theme colors.
        for (const t of Array.from(
          containerRef.current.querySelectorAll("text"),
        )) {
          (t as SVGTextElement).style.display = "none";
        }
        setPaths(collected);
        setLoading(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError("Couldn't load stroke data. Showing fallback.");
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [char]);

  // Apply stroke visibility based on current step.
  useEffect(() => {
    if (paths.length === 0) return;
    paths.forEach((p, i) => {
      const visible = i < step;
      p.style.opacity = visible ? "1" : "0";
      // Light fade-in for the most recently added stroke.
      p.style.transition = "opacity 0.25s ease";
    });
  }, [paths, step]);

  // Auto-play timer.
  useEffect(() => {
    if (!playing || paths.length === 0) return;
    if (step >= paths.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, paths.length)), 700);
    return () => clearTimeout(t);
  }, [playing, step, paths.length]);

  const total = paths.length || totalStrokesHint || 0;
  const safeStep = Math.min(step, total || step);

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-xs rounded-2xl border-2 border-dashed border-border bg-muted/20 p-4">
        <div
          ref={containerRef}
          className="absolute inset-4 text-foreground"
          aria-label={`Stroke order for ${char}`}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="jp text-7xl">{char}</div>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}
        {!loading && !error && total > 0 && (
          <div className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full border bg-background px-2 py-0.5 text-xs font-bold tabular-nums">
            Stroke {safeStep} / {total}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPlaying(false);
            setStep(1);
          }}
          aria-label="Restart"
          disabled={total === 0}
        >
          <SkipBack className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPlaying(false);
            setStep((s) => Math.max(1, s - 1));
          }}
          disabled={total === 0 || step <= 1}
        >
          Prev
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (step >= total) setStep(1);
            setPlaying((p) => !p);
          }}
          disabled={total === 0}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPlaying(false);
            setStep((s) => Math.min(total, s + 1));
          }}
          disabled={total === 0 || step >= total}
        >
          Next
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPlaying(false);
            setStep(total);
          }}
          disabled={total === 0}
        >
          <RotateCcw className="size-4" />
          Show all
        </Button>
      </div>
    </div>
  );
}
