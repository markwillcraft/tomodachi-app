"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Flame,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Target,
  Volume2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HIRAGANA,
  KATAKANA,
  KANA_GROUPS,
  type KanaPair,
  type KanaScript,
} from "@/lib/kana";
import { speakJapanese } from "@/lib/speech";

type SetupState = {
  script: KanaScript;
  selected: Set<string>;
  audio: boolean;
  length: number;
};

type Phase = "setup" | "drill" | "done";

const LENGTH_OPTIONS = [20, 50, 100, 200];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildPool(setup: SetupState): KanaPair[] {
  const wantedRomaji = new Set(
    KANA_GROUPS.filter((g) => setup.selected.has(g.id)).flatMap(
      (g) => g.romaji,
    ),
  );
  const list: KanaPair[] = [];
  if (setup.script === "hiragana" || setup.script === "both") {
    for (const k of HIRAGANA) if (wantedRomaji.has(k.romaji)) list.push(k);
  }
  if (setup.script === "katakana" || setup.script === "both") {
    for (const k of KATAKANA) if (wantedRomaji.has(k.romaji)) list.push(k);
  }
  return list;
}

function buildSequence(setup: SetupState): KanaPair[] {
  const pool = buildPool(setup);
  if (pool.length === 0) return [];
  const out: KanaPair[] = [];
  let bag: KanaPair[] = [];
  let lastRomaji: string | null = null;
  while (out.length < setup.length) {
    if (bag.length === 0) bag = shuffle(pool);
    const next = bag.pop()!;
    if (next.romaji === lastRomaji && bag.length > 0) {
      bag.unshift(next);
      continue;
    }
    out.push(next);
    lastRomaji = next.romaji;
  }
  return out;
}

export function KanaMuscleMemory() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [setup, setSetup] = useState<SetupState>({
    script: "hiragana",
    selected: new Set(["a", "k", "s", "t", "n"]),
    audio: true,
    length: 50,
  });
  const [sequence, setSequence] = useState<KanaPair[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shake, setShake] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const total = sequence.length;
  const current = sequence[index];

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  function start() {
    const seq = buildSequence(setup);
    if (seq.length === 0) return;
    setSequence(seq);
    setIndex(0);
    setTyped("");
    setCorrectCount(0);
    setWrongCount(0);
    setBestStreak(0);
    setStreak(0);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
    pausedAtRef.current = null;
    setPaused(false);
    setPhase("drill");
    setTimeout(focusInput, 50);
  }

  function restart() {
    start();
  }

  function backToSetup() {
    setPhase("setup");
  }

  useEffect(() => {
    if (phase !== "drill" || paused) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  function togglePause() {
    if (phase !== "drill") return;
    if (paused) {
      const pausedFor = Date.now() - (pausedAtRef.current ?? Date.now());
      startedAtRef.current += pausedFor;
      pausedAtRef.current = null;
      setPaused(false);
      setTimeout(focusInput, 50);
    } else {
      pausedAtRef.current = Date.now();
      setPaused(true);
    }
  }

  function advance(wasCorrect: boolean) {
    setTyped("");
    if (wasCorrect) {
      setCorrectCount((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      if (setup.audio && current) speakJapanese(current.kana, 1.0);
    } else {
      setWrongCount((w) => w + 1);
      setStreak(0);
      setShake(true);
      window.setTimeout(() => setShake(false), 280);
    }
    if (index + 1 >= sequence.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (paused || !current) return;
    const raw = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
    const target = current.romaji;
    if (raw === target) {
      advance(true);
      return;
    }
    if (target.startsWith(raw)) {
      setTyped(raw);
      return;
    }
    advance(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      togglePause();
    }
  }

  const accuracy =
    correctCount + wrongCount === 0
      ? 0
      : Math.round((correctCount / (correctCount + wrongCount)) * 100);

  if (phase === "setup") {
    return <SetupView setup={setup} setSetup={setSetup} onStart={start} />;
  }

  if (phase === "done") {
    return (
      <DoneView
        total={total}
        correct={correctCount}
        wrong={wrongCount}
        bestStreak={bestStreak}
        elapsedMs={elapsedMs}
        onRestart={restart}
        onBack={backToSetup}
      />
    );
  }

  return (
    <div className="space-y-6" onClick={focusInput}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip
          icon={<Target className="size-4" />}
          label="Progress"
          value={`${index + 1} / ${total}`}
          tone="violet"
        />
        <StatChip
          icon={<Zap className="size-4" />}
          label="Accuracy"
          value={`${accuracy}%`}
          tone="emerald"
        />
        <StatChip
          icon={<Flame className="size-4" />}
          label="Streak"
          value={`${streak}${bestStreak > streak ? ` · best ${bestStreak}` : ""}`}
          tone="amber"
        />
        <StatChip
          icon={<Keyboard className="size-4" />}
          label="Time"
          value={formatTime(elapsedMs)}
          tone="slate"
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100 shadow-2xl">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.25), transparent 60%)",
          }}
        />
        <div className="relative">
          <KanaBand
            sequence={sequence}
            index={index}
            typed={typed}
            shake={shake}
          />
        </div>

        <div className="relative flex flex-col items-center gap-3 border-t border-white/5 bg-black/30 px-4 py-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Keyboard className="size-3.5" />
            {paused
              ? "Paused — press Esc or hit resume to continue"
              : "Type the romaji for the highlighted kana. Esc to pause."}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                togglePause();
              }}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                restart();
              }}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                backToSetup();
              }}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Settings2 className="size-3.5" />
              Select kana
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label="Type the romaji"
        className="sr-only"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}

function KanaBand({
  sequence,
  index,
  typed,
  shake,
}: {
  sequence: KanaPair[];
  index: number;
  typed: string;
  shake: boolean;
}) {
  const CELL = 88; // px width per kana cell
  const offset = `calc(50% - ${CELL / 2}px - ${index * CELL}px)`;

  return (
    <div className="relative h-44 sm:h-56">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-950 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-950 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-32 w-24 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 sm:h-40"
      />
      <div
        className={cn(
          "absolute top-1/2 flex -translate-y-1/2 items-end transition-[left] duration-300 ease-out",
          shake && "animate-shake",
        )}
        style={{ left: offset }}
      >
        {sequence.map((k, i) => {
          const distance = i - index;
          const isCurrent = distance === 0;
          const isPast = distance < 0;
          const fade =
            distance === 0
              ? 1
              : Math.abs(distance) === 1
                ? 0.55
                : Math.abs(distance) === 2
                  ? 0.32
                  : Math.abs(distance) === 3
                    ? 0.18
                    : 0.1;
          return (
            <div
              key={`${i}-${k.kana}`}
              className="relative flex h-40 flex-col items-center justify-end pb-2 sm:h-48"
              style={{ width: CELL, opacity: fade }}
            >
              {isCurrent && typed.length > 0 && (
                <div className="absolute top-2 text-base font-semibold tracking-wider text-emerald-300 sm:text-lg">
                  {typed}
                </div>
              )}
              <div
                className={cn(
                  "jp font-bold leading-none transition-colors",
                  isCurrent
                    ? "text-emerald-300 text-7xl sm:text-8xl"
                    : isPast
                      ? "text-slate-500 text-5xl sm:text-6xl"
                      : "text-slate-200 text-5xl sm:text-6xl",
                )}
              >
                {k.kana}
              </div>
              {isCurrent && (
                <div className="absolute bottom-0 h-0.5 w-12 rounded-full bg-emerald-400 sm:w-16" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetupView({
  setup,
  setSetup,
  onStart,
}: {
  setup: SetupState;
  setSetup: (s: SetupState) => void;
  onStart: () => void;
}) {
  const pool = useMemo(() => buildPool(setup), [setup]);

  function toggleGroup(id: string) {
    const next = new Set(setup.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSetup({ ...setup, selected: next });
  }

  function selectByType(type: "all" | "gojuon" | "dakuten" | "handakuten") {
    setSetup({
      ...setup,
      selected: new Set(
        KANA_GROUPS.filter((g) => type === "all" || g.type === type).map(
          (g) => g.id,
        ),
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Script
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "hiragana", label: "Hiragana · ひらがな" },
              { id: "katakana", label: "Katakana · カタカナ" },
              { id: "both", label: "Both · ひら + カタ" },
            ] as Array<{ id: KanaScript; label: string }>
          ).map((opt) => (
            <Button
              key={opt.id}
              variant={setup.script === opt.id ? "default" : "outline"}
              onClick={() => setSetup({ ...setup, script: opt.id })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Rows
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
            {pool.length} kana in pool
          </span>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => selectByType("all")}>
            All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selectByType("gojuon")}
          >
            Basic
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selectByType("dakuten")}
          >
            Dakuten
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selectByType("handakuten")}
          >
            Handakuten
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSetup({ ...setup, selected: new Set() })}
          >
            None
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KANA_GROUPS.map((g) => {
            const on = setup.selected.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  on
                    ? "border-emerald-400/60 bg-emerald-500/10 text-foreground"
                    : "border-input bg-card text-muted-foreground hover:bg-accent/40",
                )}
              >
                <div className="font-medium">{g.label}</div>
                <div className="text-[10px] uppercase opacity-70">{g.type}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Session length
          </div>
          <div className="flex flex-wrap gap-2">
            {LENGTH_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={setup.length === n ? "default" : "outline"}
                onClick={() => setSetup({ ...setup, length: n })}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Audio
          </div>
          <button
            onClick={() => setSetup({ ...setup, audio: !setup.audio })}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
              setup.audio
                ? "border-emerald-400/50 bg-emerald-500/10"
                : "border-input bg-card",
            )}
          >
            <span className="flex items-center gap-2 text-sm">
              <Volume2 className="size-4" />
              Speak each correct kana
            </span>
            <span
              className={cn(
                "inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                setup.audio ? "bg-emerald-500" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full bg-white shadow transition-transform",
                  setup.audio ? "translate-x-4" : "translate-x-0",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onStart}
          disabled={pool.length === 0}
          className="gap-2"
        >
          <Play className="size-4" />
          Start drill
        </Button>
      </div>
    </div>
  );
}

function DoneView({
  total,
  correct,
  wrong,
  bestStreak,
  elapsedMs,
  onRestart,
  onBack,
}: {
  total: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  elapsedMs: number;
  onRestart: () => void;
  onBack: () => void;
}) {
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  const wpm =
    elapsedMs === 0 ? 0 : Math.round((correct / (elapsedMs / 1000)) * 60);
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/15 via-background to-background p-8 text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
          Drill complete
        </div>
        <div className="mt-2 text-6xl font-bold tabular-nums">{accuracy}%</div>
        <div className="mt-2 text-muted-foreground">
          {correct} correct · {wrong} mistakes · best streak {bestStreak}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Time" value={formatTime(elapsedMs)} />
        <StatTile label="Kana per minute" value={String(wpm)} />
        <StatTile label="Best streak" value={String(bestStreak)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Change settings
        </Button>
        <Button onClick={onRestart}>
          <RotateCcw className="size-4" />
          Drill again
        </Button>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "violet" | "emerald" | "amber" | "slate";
}) {
  const TONE = {
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  } as const;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className={cn("inline-flex size-6 items-center justify-center rounded-md", TONE[tone])}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
