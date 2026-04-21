"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Pause,
  Play,
  Repeat,
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
// Tracing speed in SVG user units per millisecond. This matches how the
// KanjiVG viewer (KanjivgAnimate) animates: a constant pen speed, so short
// strokes finish quickly and long strokes take proportionally longer. The
// result feels like a hand actually writing the character instead of every
// stroke burning the same amount of wall-clock time regardless of length.
const SPEED_PX_PER_MS: Record<Speed, number> = {
  slow: 0.12,
  normal: 0.22,
  fast: 0.45,
};
const SPEED_LABEL: Record<Speed, string> = {
  slow: "0.5×",
  normal: "1×",
  fast: "2×",
};
// Small pause between consecutive strokes so the eye can register that one
// finished before the next starts. KanjivgAnimate uses roughly this gap.
const INTER_STROKE_GAP_MS = 90;
// Pause before the auto-loop restarts from stroke 1, so the learner can
// see the finished glyph for a beat before the trace begins again.
const LOOP_PAUSE_MS = 1400;
// Persistent per-stroke colors in the classic Japanese textbook "rainbow"
// stroke-order convention. We pin the first six strokes to a curated set
// that reads cleanly (red → blue → orange → green → purple → teal — same
// anchors japanesejlpt.com uses on their stroke-order GIFs), then for
// longer kanji we generate evenly-spaced hues so EVERY stroke ends up
// with a distinct color instead of cycling and reusing red on stroke 7.
const ANCHOR_STROKE_COLORS = [
  "#E14C4C", // 1 red
  "#3F8FD3", // 2 blue
  "#E69A2E", // 3 orange
  "#3CA063", // 4 green
  "#9656C6", // 5 purple
  "#1FA095", // 6 teal
] as const;
function colorForStroke(i: number, total: number): string {
  // For short kanji keep the textbook anchors so 五, 三, etc. look exactly
  // like the reference. Once we'd run out, switch to an evenly-spread
  // HSL palette keyed to the actual stroke count of THIS kanji so colors
  // stay unique through the longest N5 kanji (語/読/駅 at 14 strokes).
  if (total <= ANCHOR_STROKE_COLORS.length) {
    return ANCHOR_STROKE_COLORS[i];
  }
  const hue = Math.round((i / total) * 360);
  // Skip the muddy yellow band (~55–75°) by nudging hues away from it,
  // and keep saturation/lightness fixed so every stroke reads with the
  // same visual weight.
  const adjusted = hue >= 55 && hue <= 75 ? hue + 25 : hue;
  return `hsl(${adjusted} 68% 48%)`;
}

// Push the numbered label outward from the canvas center along the
// direction the stroke's start point sits. This keeps numbers in the
// margin instead of sitting on top of the strokes themselves — same
// trick the textbook GIFs use to keep labels legible on dense kanji.
function labelOffsetFor(start: { x: number; y: number }): {
  dx: number;
  dy: number;
} {
  const cx = 54.5; // KanjiVG canvas is 109x109; center is (54.5, 54.5)
  const cy = 54.5;
  const dx = start.x - cx;
  const dy = start.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const PAD = 6.5;
  return { dx: (dx / len) * PAD, dy: (dy / len) * PAD };
}

type StrokeInfo = {
  d: string;
  length: number;
  start: { x: number; y: number };
};

const SVG_NS = "http://www.w3.org/2000/svg";

// Parse the raw KanjiVG SVG markup into the shape we render with.
// Critically we extract ONLY the `d` strings + their measured lengths
// and start points, and feed those back into a single React-controlled
// <svg>. That way there's exactly one rendering of every stroke, no
// chance of two layers drifting out of alignment at different sizes.
function parseKanjiVg(
  markup: string,
): { viewBox: string; strokes: StrokeInfo[] } | null {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  const viewBox = svg.getAttribute("viewBox") ?? "0 0 109 109";

  // Stroke paths live under `kvg:StrokePaths_*`; KanjiVG also has a
  // separate `kvg:StrokeNumbers_*` group full of <text> elements (no
  // <path>s in there), so a flat path query still gives us strokes only,
  // but we scope to the StrokePaths container to be safe.
  const strokeRoot =
    svg.querySelector('[id^="kvg:StrokePaths_"]') ?? svg;
  const dList = Array.from(strokeRoot.querySelectorAll("path"))
    .map((p) => p.getAttribute("d") ?? "")
    .filter(Boolean);

  // To measure path length / start point we need a real SVGPathElement.
  // Some browsers return 0 (or inaccurate values) for getTotalLength()
  // on paths that aren't actually attached to the document, which is why
  // we mount a hidden 0×0 measurement SVG into <body> for the duration
  // of this loop and tear it down afterwards. Without this step the
  // animated dasharray ends up shorter than the real rendered path and
  // you see the stroke render as a broken dash pattern instead of a
  // continuous line.
  const measureSvg = document.createElementNS(SVG_NS, "svg");
  measureSvg.setAttribute("viewBox", viewBox);
  measureSvg.setAttribute(
    "style",
    "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;",
  );
  measureSvg.setAttribute("aria-hidden", "true");
  const measurePath = document.createElementNS(SVG_NS, "path");
  measureSvg.appendChild(measurePath);
  document.body.appendChild(measureSvg);

  let strokes: StrokeInfo[] = [];
  try {
    strokes = dList.map((d) => {
      measurePath.setAttribute("d", d);
      const length = measurePath.getTotalLength();
      const start = measurePath.getPointAtLength(0);
      return { d, length, start: { x: start.x, y: start.y } };
    });
  } finally {
    measureSvg.remove();
  }
  return { viewBox, strokes };
}

export function KanjiStrokeDisplay({
  char,
  totalStrokesHint,
}: {
  char: string;
  totalStrokesHint?: number;
}) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [strokes, setStrokes] = useState<StrokeInfo[]>([]);
  const [viewBox, setViewBox] = useState<string>("0 0 109 109");
  const [step, setStep] = useState(1); // 1-based: strokes 1..step-1 are done, step-1 is drawing
  const [playing, setPlaying] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState<Speed>("slow");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the character changes.
  useEffect(() => {
    setStep(1);
    setPlaying(false);
    setStrokes([]);
    setError(null);
    setLoading(true);
  }, [char]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(kanjiVgUrl(char), { signal: ctrl.signal });
        if (!res.ok) throw new Error(`KanjiVG ${res.status}`);
        const text = await res.text();
        const cleaned = text.replace(/<\?xml[^?]*\?>/, "").trim();
        const parsed = parseKanjiVg(cleaned);
        if (!parsed || parsed.strokes.length === 0) {
          setError("Couldn't parse stroke data.");
          setLoading(false);
          return;
        }
        setViewBox(parsed.viewBox);
        setStrokes(parsed.strokes);
        setLoading(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError("Couldn't load stroke data. Showing fallback.");
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [char]);

  // Each stroke's draw time is proportional to its path length so the
  // "pen" moves at a constant speed across the glyph (same feel as the
  // KanjiVG viewer / KanjivgAnimate).
  const strokeDurationMs = (length: number) =>
    Math.max(120, length / SPEED_PX_PER_MS[speed]);

  // Drive the drawing animation by mutating dashoffset on the live path
  // refs whenever `step` changes. Using refs (instead of pushing the
  // values through React state) keeps the CSS transition smooth.
  //
  // The "drawing" stroke is reset to fully hidden first, then a forced
  // reflow lets the browser commit that hidden state to the render tree
  // before we transition it back to visible. Without this two-step
  // process the very first stroke would never animate — its initial
  // mounted state is already "fully drawn", so going straight to
  // dashoffset=0 is a no-op.
  useEffect(() => {
    if (strokes.length === 0) return;
    strokes.forEach(({ length }, i) => {
      const path = pathRefs.current[i];
      if (!path) return;
      path.style.strokeDasharray = `${length}`;
      const completed = i < step - 1;
      const drawing = i === step - 1;
      if (completed) {
        path.style.transition = "none";
        path.style.strokeDashoffset = "0";
      } else if (drawing) {
        const durMs = strokeDurationMs(length);
        path.style.transition = "none";
        path.style.strokeDashoffset = `${length}`;
        // Force a synchronous layout flush so the "hidden" state lands
        // before the next style write, otherwise the browser collapses
        // both writes into a single paint and we lose the transition.
        void path.getBoundingClientRect();
        path.style.transition = `stroke-dashoffset ${durMs}ms linear`;
        path.style.strokeDashoffset = "0";
      } else {
        path.style.transition = "none";
        path.style.strokeDashoffset = `${length}`;
      }
    });
  }, [strokes, step, speed]);

  // Auto-advance on a timer keyed to the CURRENT stroke's length so the
  // scheduler matches the CSS transition above. A small inter-stroke gap
  // gives the eye a beat between strokes without feeling choppy. When
  // `loop` is on we wait a longer beat after the last stroke and then
  // restart from stroke 1, mirroring the looping trace animations on
  // sites like japanesejlpt.com.
  useEffect(() => {
    if (!playing || strokes.length === 0) return;
    if (step > strokes.length) {
      if (!loop) {
        setPlaying(false);
        return;
      }
      const t = setTimeout(() => setStep(1), LOOP_PAUSE_MS);
      return () => clearTimeout(t);
    }
    const current = strokes[step - 1];
    const durMs = current ? strokeDurationMs(current.length) : 400;
    const t = setTimeout(() => {
      setStep((s) => Math.min(s + 1, strokes.length + 1));
    }, durMs + INTER_STROKE_GAP_MS);
    return () => clearTimeout(t);
  }, [playing, step, strokes, speed, loop]);

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
        {/* One single SVG renders the grid, ghost outlines, animated
            strokes, optional pulsing start dot, and numbered labels —
            all sharing the same viewBox and the same coordinate system
            so nothing can drift out of alignment. */}
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] text-foreground"
          aria-label={`Stroke order for ${char}`}
        >
          {/* 3x3 dotted reference grid — rose-tinted, like the pink guide
              lines on Japanese stroke-order practice paper. */}
          {[1, 2].map((n) => (
            <line
              key={`v-${n}`}
              x1={gridLines.x0 + (gridLines.w * n) / 3}
              y1={gridLines.y0}
              x2={gridLines.x0 + (gridLines.w * n) / 3}
              y2={gridLines.y0 + gridLines.h}
              stroke="hsl(340 80% 75%)"
              strokeOpacity={0.45}
              strokeWidth={0.5}
              strokeDasharray="1.5 2.5"
            />
          ))}
          {[1, 2].map((n) => (
            <line
              key={`h-${n}`}
              x1={gridLines.x0}
              y1={gridLines.y0 + (gridLines.h * n) / 3}
              x2={gridLines.x0 + gridLines.w}
              y2={gridLines.y0 + (gridLines.h * n) / 3}
              stroke="hsl(340 80% 75%)"
              strokeOpacity={0.45}
              strokeWidth={0.5}
              strokeDasharray="1.5 2.5"
            />
          ))}

          {/* Faint preview of every stroke so the learner always sees
              the final shape. We deliberately do NOT use
              `vector-effect: non-scaling-stroke` here: when that's set,
              browsers compute `stroke-dasharray` in screen pixels
              instead of user units, which makes the animated dash
              length (measured in user units) render shorter than the
              real path and the stroke appears broken into segments.
              Keeping stroke widths in user units lines the ghost up
              perfectly under the animated stroke. */}
          {strokes.map((s, i) => (
            <path
              key={`ghost-${i}`}
              d={s.d}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.13}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* The actual animated strokes. dashoffset is mutated via refs
              so the CSS transition stays smooth without re-rendering. */}
          {strokes.map((s, i) => (
            <path
              key={`stroke-${i}`}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={s.d}
              fill="none"
              stroke={colorForStroke(i, strokes.length)}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {!showNumbers &&
            activeStart &&
            !loading &&
            !error &&
            step <= strokes.length && (
              <g>
                <circle
                  cx={activeStart.x}
                  cy={activeStart.y}
                  r={3}
                  fill={colorForStroke(activeIdx, strokes.length)}
                  className="animate-pulse"
                />
                <circle
                  cx={activeStart.x}
                  cy={activeStart.y}
                  r={5.5}
                  fill="none"
                  stroke={colorForStroke(activeIdx, strokes.length)}
                  strokeWidth={0.8}
                  opacity={0.5}
                />
              </g>
            )}

          {showNumbers &&
            strokes.map((s, i) => {
              const offset = labelOffsetFor(s.start);
              const lx = s.start.x + offset.dx;
              const ly = s.start.y + offset.dy;
              const color = colorForStroke(i, strokes.length);
              return (
                <text
                  key={`num-${i}`}
                  x={lx}
                  y={ly + 2.4}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={800}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.4}
                  paintOrder="stroke"
                >
                  {i + 1}
                </text>
              );
            })}
        </svg>

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

      {!loading && !error && strokes.length > 0 && (
        <StrokeOrderGrid
          strokes={strokes}
          viewBox={viewBox}
          activeIndex={step - 1}
          onSelect={(i) => {
            setPlaying(false);
            setStep(i + 1);
          }}
        />
      )}

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
            {(Object.keys(SPEED_PX_PER_MS) as Speed[]).map((s) => (
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
          <Button
            variant={loop ? "default" : "outline"}
            size="sm"
            onClick={() => setLoop((v) => !v)}
            className="h-7 gap-1 text-xs"
            aria-pressed={loop}
            title={loop ? "Looping enabled" : "Looping disabled"}
          >
            <Repeat className="size-3.5" />
            Loop
          </Button>
        </div>
      </div>
    </div>
  );
}

// Cumulative stroke-order diagram: one mini-tile per stroke, where tile N
// shows strokes 1..N drawn solid and a red dot marking the start point of
// stroke N (the newly added one). This is the textbook "stroke order grid"
// found on sites like japanesejlpt.com — a static reference learners can
// scan all at once, complementing the animated trace above.
function StrokeOrderGrid({
  strokes,
  viewBox,
  activeIndex,
  onSelect,
}: {
  strokes: StrokeInfo[];
  viewBox: string;
  activeIndex: number;
  onSelect?: (index: number) => void;
}) {
  // Snapshot path `d` strings once per `strokes` change. We can't reuse
  // the live SVGPathElement nodes from the animated viewer because they
  // already live inside another <svg> in the DOM; React would move them
  // around. The `d` attribute is all the grid actually needs.
  const dList = useMemo(
    () => strokes.map((s) => s.d),
    [strokes],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-sm font-semibold">Stroke Order Diagram</h3>
        <p className="text-[11px] text-muted-foreground">
          Red dot = start of the new stroke
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {strokes.map((s, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={`grid-${i}`}
              type="button"
              onClick={() => onSelect?.(i)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-md border bg-card p-1 text-left transition-colors",
                isActive
                  ? "border-rose-400/80 ring-2 ring-rose-400/40"
                  : "hover:border-rose-300/60 hover:bg-rose-500/5",
              )}
              aria-label={`Show stroke ${i + 1}`}
            >
              <svg
                viewBox={viewBox}
                className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)]"
                aria-hidden
              >
                {dList.map((d, j) => (
                  <path
                    key={`g-ghost-${j}`}
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.12}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {dList.slice(0, i + 1).map((d, j) => (
                  <path
                    key={`g-done-${j}`}
                    d={d}
                    fill="none"
                    stroke={colorForStroke(j, strokes.length)}
                    strokeOpacity={j === i ? 1 : 0.85}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                <circle
                  cx={s.start.x}
                  cy={s.start.y}
                  r={3.6}
                  fill={colorForStroke(i, strokes.length)}
                  stroke="white"
                  strokeWidth={0.8}
                />
              </svg>
              <span
                className="absolute bottom-0.5 right-1 text-[10px] font-bold tabular-nums"
                style={{ color: colorForStroke(i, strokes.length) }}
              >
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
