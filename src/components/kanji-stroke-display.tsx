"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { kanjiVgUrl } from "@/lib/kanji";
import { cn } from "@/lib/utils";

// Renders an animated stroke-order viewer for a single kanji using a
// KanjiVG SVG. Each stroke literally draws itself from start to end by
// animating SVG `stroke-dashoffset` — this looks like a hand tracing the
// shape, which is what learners actually want to see (and what the
// opacity-stepping version lacked).
//
// Layout:
//   - A faint "ghost" of every stroke is always visible, so learners can
//     preview the final shape of the character.
//   - Completed strokes render solid in the foreground color.
//   - The currently-drawing stroke renders in the primary accent color
//     and shows a small dot at its starting point, so the learner knows
//     which direction the brush moves from.
//   - Optional overlay of stroke numbers (1, 2, 3, …) anchored at each
//     stroke's start point.

type Speed = "slow" | "normal" | "fast";
const SPEED_MS: Record<Speed, number> = {
  slow: 900,
  normal: 550,
  fast: 320,
};
const SPEED_LABEL: Record<Speed, string> = {
  slow: "0.5×",
  normal: "1×",
  fast: "2×",
};

type StrokeInfo = {
  path: SVGPathElement;
  length: number;
  start: { x: number; y: number };
};

export function KanjiStrokeDisplay({
  char,
  totalStrokesHint,
}: {
  char: string;
  totalStrokesHint?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<StrokeInfo[]>([]);
  const [viewBox, setViewBox] = useState<string>("0 0 109 109");
  const [step, setStep] = useState(1); // 1-based: strokes 1..step-1 are done, step-1 is drawing
  const [playing, setPlaying] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the character changes.
  useEffect(() => {
    setStep(1);
    setPlaying(false);
    setStrokes([]);
    setError(null);
    setLoading(true);
    setSvgMarkup(null);
  }, [char]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(kanjiVgUrl(char), { signal: ctrl.signal });
        if (!res.ok) throw new Error(`KanjiVG ${res.status}`);
        const text = await res.text();
        const cleaned = text.replace(/<\?xml[^?]*\?>/, "").trim();
        setSvgMarkup(cleaned);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError("Couldn't load stroke data. Showing fallback.");
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [char]);

  // Once markup is injected, measure each path and store length + start
  // point. We also hide the original numeric text labels and pull out the
  // viewBox so our overlay grid sits on the same coordinate system.
  useEffect(() => {
    if (!svgMarkup || !hostRef.current) return;
    hostRef.current.innerHTML = svgMarkup;
    const svg = hostRef.current.querySelector("svg");
    if (!svg) {
      setError("Invalid SVG");
      setLoading(false);
      return;
    }
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.removeAttribute("style");
    const vb = svg.getAttribute("viewBox") ?? "0 0 109 109";
    setViewBox(vb);

    // Hide KanjiVG's baked-in numbers; we render our own.
    for (const t of Array.from(svg.querySelectorAll("text"))) {
      (t as SVGTextElement).style.display = "none";
    }

    const pathNodes = Array.from(
      svg.querySelectorAll("path"),
    ) as SVGPathElement[];

    const collected: StrokeInfo[] = pathNodes.map((p) => {
      const length = p.getTotalLength();
      const s = p.getPointAtLength(0);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      p.setAttribute("stroke-width", "3.5");
      p.setAttribute("vector-effect", "non-scaling-stroke");
      p.style.strokeDasharray = `${length}`;
      p.style.strokeDashoffset = `${length}`;
      return { path: p, length, start: { x: s.x, y: s.y } };
    });
    setStrokes(collected);
    setLoading(false);
  }, [svgMarkup]);

  // Drive the drawing animation by updating dashoffset on each path when
  // step changes. CSS transitions handle the visible draw.
  useEffect(() => {
    if (strokes.length === 0) return;
    const durMs = SPEED_MS[speed];
    strokes.forEach(({ path, length }, i) => {
      const completed = i < step - 1;
      const drawing = i === step - 1;
      path.style.transition =
        drawing || completed
          ? `stroke-dashoffset ${durMs}ms ease-in-out, stroke 250ms ease`
          : `stroke-dashoffset 0ms, stroke 150ms ease`;
      if (completed) {
        path.style.strokeDashoffset = "0";
        path.setAttribute("stroke", "currentColor");
        path.style.opacity = "1";
      } else if (drawing) {
        path.style.strokeDashoffset = "0";
        path.setAttribute("stroke", "var(--stroke-active, hsl(217 91% 60%))");
        path.style.opacity = "1";
      } else {
        path.style.strokeDashoffset = `${length}`;
        path.setAttribute("stroke", "currentColor");
        path.style.opacity = "1";
      }
    });
  }, [strokes, step, speed]);

  // Auto-advance on a timer that's slightly longer than the draw
  // duration so each stroke finishes rendering before the next begins.
  useEffect(() => {
    if (!playing || strokes.length === 0) return;
    if (step > strokes.length) {
      setPlaying(false);
      return;
    }
    const durMs = SPEED_MS[speed];
    const t = setTimeout(() => {
      setStep((s) => Math.min(s + 1, strokes.length + 1));
    }, durMs + 220);
    return () => clearTimeout(t);
  }, [playing, step, strokes.length, speed]);

  const total = strokes.length || totalStrokesHint || 0;
  const safeStep = Math.min(step, total || step);
  const activeIdx = Math.max(0, Math.min(step - 1, strokes.length - 1));
  const activeStart = strokes[activeIdx]?.start ?? null;

  const gridLines = useMemo(() => {
    // KanjiVG uses a 109×109 viewBox; guide lines at 1/2 help proportions.
    const parts = viewBox.split(/\s+/).map((n) => parseFloat(n));
    const [x0, y0, w, h] = parts.length === 4 ? parts : [0, 0, 109, 109];
    return { x0, y0, w, h };
  }, [viewBox]);

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border bg-gradient-to-br from-muted/40 to-muted/10 p-2 shadow-sm">
        <svg
          viewBox={viewBox}
          className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] text-foreground/10"
          aria-hidden
        >
          <line
            x1={gridLines.x0 + gridLines.w / 2}
            y1={gridLines.y0}
            x2={gridLines.x0 + gridLines.w / 2}
            y2={gridLines.y0 + gridLines.h}
            stroke="currentColor"
            strokeWidth={0.75}
            strokeDasharray="2 3"
          />
          <line
            x1={gridLines.x0}
            y1={gridLines.y0 + gridLines.h / 2}
            x2={gridLines.x0 + gridLines.w}
            y2={gridLines.y0 + gridLines.h / 2}
            stroke="currentColor"
            strokeWidth={0.75}
            strokeDasharray="2 3"
          />
        </svg>

        <svg
          viewBox={viewBox}
          className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] text-foreground/15"
          aria-hidden
        >
          {strokes.map((s, i) => (
            <path
              key={`ghost-${i}`}
              d={s.path.getAttribute("d") ?? ""}
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div
          ref={hostRef}
          className="absolute inset-4 text-foreground [&_svg]:h-full [&_svg]:w-full"
          aria-label={`Stroke order for ${char}`}
        />

        {activeStart && !loading && !error && step <= strokes.length && (
          <svg
            viewBox={viewBox}
            className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]"
            aria-hidden
          >
            <circle
              cx={activeStart.x}
              cy={activeStart.y}
              r={3}
              fill="hsl(217 91% 60%)"
              className="animate-pulse"
            />
            <circle
              cx={activeStart.x}
              cy={activeStart.y}
              r={5.5}
              fill="none"
              stroke="hsl(217 91% 60%)"
              strokeWidth={0.8}
              opacity={0.5}
            />
          </svg>
        )}

        {showNumbers && (
          <svg
            viewBox={viewBox}
            className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]"
            aria-hidden
          >
            {strokes.map((s, i) => (
              <g key={`num-${i}`}>
                <circle
                  cx={s.start.x}
                  cy={s.start.y}
                  r={4}
                  fill="white"
                  stroke="hsl(217 91% 50%)"
                  strokeWidth={0.6}
                />
                <text
                  x={s.start.x}
                  y={s.start.y + 1.7}
                  textAnchor="middle"
                  fontSize={5}
                  fontWeight={700}
                  fill="hsl(217 91% 40%)"
                >
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
        )}

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
          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border bg-background/90 px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm backdrop-blur">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Stroke {safeStep > total ? total : safeStep} / {total}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
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
              if (step > total) setStep(1);
              setPlaying((p) => !p);
            }}
            disabled={total === 0}
            className="min-w-20"
          >
            {playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.min(total + 1, s + 1));
            }}
            disabled={total === 0 || step > total}
          >
            Next
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlaying(false);
              setStep(total + 1);
            }}
            disabled={total === 0}
          >
            <RotateCcw className="size-4" />
            Show all
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">Speed</span>
          <div className="inline-flex rounded-md border bg-card p-0.5">
            {(Object.keys(SPEED_MS) as Speed[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  speed === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SPEED_LABEL[s]}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNumbers((v) => !v)}
            className="h-7 gap-1 text-xs"
            disabled={total === 0}
          >
            {showNumbers ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {showNumbers ? "Hide numbers" : "Show numbers"}
          </Button>
        </div>
      </div>
    </div>
  );
}
