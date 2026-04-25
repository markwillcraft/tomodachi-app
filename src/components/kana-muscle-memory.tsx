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

const LENGTH_OPTIONS = [10, 20, 50, 100, 200];
const DEFAULT_SELECTED_ROWS = new Set(
  KANA_GROUPS.filter((g) => g.type === "gojuon").map((g) => g.id),
);

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
  // Baseline run is unique-only. If requested length is larger than the pool,
  // cap to pool size so we never duplicate kana on initial pass.
  const targetLength = Math.min(setup.length, pool.length);
  return shuffle(pool).slice(0, targetLength);
}

export function KanaMuscleMemory() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [setup, setSetup] = useState<SetupState>({
    script: "hiragana",
    selected: new Set(DEFAULT_SELECTED_ROWS),
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
  const [status, setStatus] = useState<"typing" | "wrong">("typing");
  const [coinsEarned, setCoinsEarned] = useState<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const drillKeyRef = useRef<string>("");
  const reportedRef = useRef<string>("");

  const audioOn = setup.audio;

  const getAudioCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback(
    (
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      peak = 0.08,
    ) => {
      if (!audioOn) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },
    [audioOn, getAudioCtx],
  );

  const playCorrect = useCallback(() => {
    // crisp upward chirp
    playTone(660, 0.07, "sine", 0.05);
    window.setTimeout(() => playTone(990, 0.1, "sine", 0.06), 35);
  }, [playTone]);

  const playWrong = useCallback(() => {
    // short low thud
    playTone(220, 0.09, "square", 0.07);
    window.setTimeout(() => playTone(150, 0.14, "square", 0.08), 60);
  }, [playTone]);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as unknown as {
      vibrate?: (p: number | number[]) => boolean;
    };
    try {
      nav.vibrate?.(pattern);
    } catch {
      // ignore
    }
  }, []);

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
    setStatus("typing");
    setCorrectCount(0);
    setWrongCount(0);
    setBestStreak(0);
    setStreak(0);
    setElapsedMs(0);
    setCoinsEarned(null);
    startedAtRef.current = Date.now();
    pausedAtRef.current = null;
    setPaused(false);
    lockedRef.current = false;
    // Stable per-attempt id so a network retry can't double-pay coins.
    drillKeyRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  // Report drill completion exactly once per attempt to mint coins.
  useEffect(() => {
    if (phase !== "done") return;
    if (!drillKeyRef.current) return;
    if (reportedRef.current === drillKeyRef.current) return;
    reportedRef.current = drillKeyRef.current;
    const total = correctCount + wrongCount;
    if (total === 0) return;
    fetch("/api/study/kana-drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drillKey: drillKeyRef.current,
        total,
        correct: correctCount,
      }),
    })
      .then((r) => r.json())
      .then((data: { coins?: { earned?: number } }) => {
        if (typeof data?.coins?.earned === "number") {
          setCoinsEarned(data.coins.earned);
        }
      })
      .catch(() => {
        // silent — coin minting is best-effort
      });
  }, [phase, correctCount, wrongCount]);

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

  function handleCorrect() {
    if (!current) return;
    const target = current.romaji;
    lockedRef.current = true;
    setTyped(target);
    setStatus("typing");
    playCorrect();
    vibrate(20);
    window.setTimeout(() => {
      setCorrectCount((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      if (setup.audio && current) speakJapanese(current.kana, 1.0);
      setTyped("");
      setStatus("typing");
      lockedRef.current = false;
      if (index + 1 >= sequence.length) {
        setPhase("done");
      } else {
        setIndex((i) => i + 1);
      }
    }, 110);
  }

  function handleWrong(raw: string) {
    lockedRef.current = true;
    setTyped(raw);
    setStatus("wrong");
    setWrongCount((w) => w + 1);
    setStreak(0);
    setShake(true);
    playWrong();
    vibrate([50, 40, 60]);
    window.setTimeout(() => setShake(false), 280);
    const badIndex = index;
    window.setTimeout(() => {
      // Send the missed kana to the end of the queue so the user has to
      // answer it again. Keep index pointing at the same slot, which now
      // holds the next kana in line.
      setSequence((prev) => {
        if (prev.length <= 1) return prev;
        const copy = [...prev];
        const [bad] = copy.splice(badIndex, 1);
        copy.push(bad);
        return copy;
      });
      setTyped("");
      setStatus("typing");
      lockedRef.current = false;
    }, 450);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (paused || !current || lockedRef.current) return;
    const raw = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
    const target = current.romaji;
    if (raw === target) {
      handleCorrect();
      return;
    }
    if (target.startsWith(raw)) {
      setTyped(raw);
      setStatus("typing");
      return;
    }
    handleWrong(raw);
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
        coinsEarned={coinsEarned}
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

      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a0f1c] text-slate-100 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-60 transition-colors duration-300",
            status === "wrong"
              ? "[background:radial-gradient(ellipse_at_50%_0%,rgba(244,63,94,0.18),transparent_70%)]"
              : "[background:radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.18),transparent_70%)]",
          )}
        />
        <div className="relative">
          <KanaBand
            sequence={sequence}
            index={index}
            typed={typed}
            status={status}
            shake={shake}
          />
        </div>

        <div className="relative flex flex-col items-center gap-3 border-t border-white/5 bg-black/20 px-4 py-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            <Keyboard className="size-3.5" />
            {paused ? "Paused · press Esc to resume" : "Type the romaji · Esc to pause"}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                togglePause();
              }}
              className="h-8 gap-1.5 text-slate-200 hover:bg-white/5 hover:text-white"
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <span aria-hidden className="h-4 w-px bg-white/10" />
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                restart();
              }}
              className="h-8 gap-1.5 text-slate-200 hover:bg-white/5 hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              Restart
            </Button>
            <span aria-hidden className="h-4 w-px bg-white/10" />
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                backToSetup();
              }}
              className="h-8 gap-1.5 text-slate-200 hover:bg-white/5 hover:text-white"
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
  status,
  shake,
}: {
  sequence: KanaPair[];
  index: number;
  typed: string;
  status: "typing" | "wrong";
  shake: boolean;
}) {
  const CELL = 96; // px width per kana cell
  const offset = `calc(50% - ${CELL / 2}px - ${index * CELL}px)`;
  const wrong = status === "wrong";

  return (
    <div className="relative">
      {/* Kana track (stimulus) */}
      <div className="relative h-40 overflow-hidden sm:h-48">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-28 bg-gradient-to-r from-[#0a0f1c] via-[#0a0f1c]/80 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-28 bg-gradient-to-l from-[#0a0f1c] via-[#0a0f1c]/80 to-transparent"
        />
        {/* Focused spotlight behind current kana */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-0 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-200",
            wrong ? "bg-rose-500/15" : "bg-emerald-500/15",
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 z-10 flex -translate-y-1/2 items-center transition-[left] duration-300 ease-out",
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
                  ? 0.5
                  : Math.abs(distance) === 2
                    ? 0.28
                    : Math.abs(distance) === 3
                      ? 0.14
                      : 0.06;
            return (
              <div
                key={`${i}-${k.kana}`}
                className="flex h-40 items-center justify-center sm:h-48"
                style={{ width: CELL, opacity: fade }}
              >
                <span
                  className={cn(
                    "jp font-bold leading-none transition-all duration-200",
                    isCurrent
                      ? cn(
                          "text-7xl drop-shadow-[0_6px_24px_rgba(16,185,129,0.25)] sm:text-8xl",
                          wrong
                            ? "text-rose-400 drop-shadow-[0_6px_24px_rgba(244,63,94,0.3)]"
                            : "text-emerald-300",
                        )
                      : isPast
                        ? "text-4xl text-slate-600 sm:text-5xl"
                        : "text-4xl text-slate-300 sm:text-5xl",
                  )}
                >
                  {k.kana}
                </span>
              </div>
            );
          })}
        </div>
        {/* Underline accent for current kana (anchored, doesn't scroll) */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-4 left-1/2 z-10 h-[3px] w-14 -translate-x-1/2 rounded-full transition-colors sm:w-20",
            wrong ? "bg-rose-400" : "bg-emerald-400",
          )}
        />
      </div>

      {/* Thin separator between stimulus and answer zones */}
      <div
        aria-hidden
        className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      {/* Answer zone (what the user has typed) */}
      <div className="flex h-20 items-center justify-center px-6 sm:h-24">
        {typed.length > 0 ? (
          <div
            className={cn(
              "flex items-center font-mono text-3xl font-semibold uppercase tabular-nums transition-colors sm:text-4xl",
              wrong ? "text-rose-400" : "text-emerald-300",
            )}
            style={{ letterSpacing: "0.5em", paddingLeft: "0.5em" }}
          >
            {typed}
          </div>
        ) : (
          <div
            aria-hidden
            className="h-9 w-[2px] animate-[blink_1.1s_ease-in-out_infinite] rounded-full bg-slate-500/70 sm:h-11"
          />
        )}
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
  const selectedCount = setup.selected.size;
  const gojuonCount = useMemo(
    () => KANA_GROUPS.filter((g) => g.type === "gojuon").length,
    [],
  );
  const dakutenCount = useMemo(
    () => KANA_GROUPS.filter((g) => g.type === "dakuten").length,
    [],
  );
  const handakutenCount = useMemo(
    () => KANA_GROUPS.filter((g) => g.type === "handakuten").length,
    [],
  );

  const isAllSelected = selectedCount === KANA_GROUPS.length;
  const isBasicSelected =
    selectedCount === gojuonCount &&
    KANA_GROUPS.every(
      (g) => g.type !== "gojuon" || setup.selected.has(g.id),
    );
  const isDakutenSelected =
    selectedCount === dakutenCount &&
    KANA_GROUPS.every(
      (g) => g.type !== "dakuten" || setup.selected.has(g.id),
    );
  const isHandakutenSelected =
    selectedCount === handakutenCount &&
    KANA_GROUPS.every(
      (g) => g.type !== "handakuten" || setup.selected.has(g.id),
    );
  const isNoneSelected = selectedCount === 0;

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
          <Button
            size="sm"
            variant={isAllSelected ? "default" : "ghost"}
            onClick={() => selectByType("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={isBasicSelected ? "default" : "ghost"}
            onClick={() => selectByType("gojuon")}
          >
            Basic
          </Button>
          <Button
            size="sm"
            variant={isDakutenSelected ? "default" : "ghost"}
            onClick={() => selectByType("dakuten")}
          >
            Dakuten
          </Button>
          <Button
            size="sm"
            variant={isHandakutenSelected ? "default" : "ghost"}
            onClick={() => selectByType("handakuten")}
          >
            Handakuten
          </Button>
          <Button
            size="sm"
            variant={isNoneSelected ? "default" : "ghost"}
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
          <p className="mt-2 text-xs text-muted-foreground">
            Unique-only run: max {pool.length} kana from your selected rows.
            Misses are moved to the end for retry.
          </p>
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
  coinsEarned,
  onRestart,
  onBack,
}: {
  total: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  elapsedMs: number;
  coinsEarned: number | null;
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
        {coinsEarned !== null && coinsEarned > 0 && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200">
            <span aria-hidden>＋</span>
            <span className="tabular-nums">{coinsEarned}</span>
            <span className="text-xs font-medium opacity-80">coins</span>
          </div>
        )}
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
