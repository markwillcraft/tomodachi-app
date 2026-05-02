"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Pause,
  RefreshCw,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { feedback } from "@/lib/feedback";
import {
  getReadingStageMeta,
  type ReadingSet,
  type ReadingStage,
  type ReadingWordRow,
} from "@/lib/reading";
import { speakJapanese } from "@/lib/speech";
import { cn } from "@/lib/utils";

const SHOW_DURATION_MS = 4000;
const REVEAL_DURATION_MS = 2500;
const TICK_SOFT_AT = [1000, 2000];
const TICK_FINAL_AT = 3000;

type Phase = "show" | "reveal";

// The Reading mode play loop. Shows one card at a time:
//   * 4s "show" phase — kana only, with countdown ticks at 1s/2s/3s
//     to telegraph the upcoming reveal.
//   * 2.5s "reveal" phase — kana shrinks slightly, romaji + english
//     fade in below a dashed divider, and `speakJapanese()` plays
//     once. The user can re-trigger audio with the Volume2 button
//     or `R`.
//   * Auto-advance to the next card. After the 50th, flips to the
//     "Stage complete" view.
//
// Spacebar / clicking the card toggles pause; Esc exits to the setup
// page. All timers and the rAF progress loop are cleaned up on
// unmount and on phase transitions to keep audio + visuals in sync
// even if the user navigates mid-stage.
export function ReadingRunner({
  stage,
  set,
  isAutoSet,
  weekdayLabel,
  words,
}: {
  stage: ReadingStage;
  set: ReadingSet;
  isAutoSet: boolean;
  weekdayLabel: string;
  words: ReadingWordRow[];
}) {
  const router = useRouter();
  const stageMeta = getReadingStageMeta(stage);

  // The server already Fisher-Yates-shuffles in
  // `getReadingWordsForStageAndSet` on every fetch, so a refresh
  // already gets a fresh order. We deliberately don't re-shuffle on
  // the client — doing so would make the SSR pass and the first
  // client render disagree (different `Math.random()` outputs) and
  // trigger a hydration error on the kana card.
  const deck = words;
  const total = deck.length;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("show");
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseStartRef = useRef<number>(0);
  const elapsedAtPauseRef = useRef<number>(0);

  // Per-session id minted on mount. Sent to
  // POST /api/reading/session-complete as the dedup key so a network
  // retry / accidental remount doesn't double-claim today's
  // `kana_reading_session` quest. Mirrors the `drillKey` pattern in
  // `kana-muscle-memory.tsx`.
  const sessionKeyRef = useRef<string>("");
  const sessionStartRef = useRef<number>(0);
  const reportedRef = useRef<string>("");
  if (sessionKeyRef.current === "") {
    sessionKeyRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `rs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStartRef.current = Date.now();
  }

  const current = deck[index];
  const phaseTotalMs =
    phase === "show" ? SHOW_DURATION_MS : REVEAL_DURATION_MS;

  const clearPhaseTimers = useCallback(() => {
    if (phaseTimerRef.current !== null) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    for (const t of tickTimersRef.current) clearTimeout(t);
    tickTimersRef.current = [];
  }, []);

  const playReveal = useCallback((word: ReadingWordRow) => {
    speakJapanese(word.display);
  }, []);

  // Schedule the timers + ticks for the current phase + index. Called
  // on phase entry and on resume from pause; `remainingMs` lets the
  // resume case skip already-elapsed time so the bar doesn't jump.
  const armPhase = useCallback(
    (
      currentPhase: Phase,
      currentIndex: number,
      remainingMs: number,
    ) => {
      clearPhaseTimers();
      const totalMs =
        currentPhase === "show" ? SHOW_DURATION_MS : REVEAL_DURATION_MS;
      const elapsed = totalMs - remainingMs;
      phaseStartRef.current = performance.now() - elapsed;

      if (currentPhase === "show") {
        // Schedule outstanding ticks (skip ones whose moment has
        // already passed in this phase, e.g. on resume mid-window).
        for (const t of TICK_SOFT_AT) {
          if (t > elapsed) {
            tickTimersRef.current.push(
              setTimeout(() => feedback.tickSoft(), t - elapsed),
            );
          }
        }
        if (TICK_FINAL_AT > elapsed) {
          tickTimersRef.current.push(
            setTimeout(() => feedback.tickFinal(), TICK_FINAL_AT - elapsed),
          );
        }
      }

      phaseTimerRef.current = setTimeout(() => {
        if (currentPhase === "show") {
          setPhase("reveal");
          playReveal(deck[currentIndex]);
          armPhase("reveal", currentIndex, REVEAL_DURATION_MS);
        } else {
          const next = currentIndex + 1;
          if (next >= deck.length) {
            setDone(true);
            return;
          }
          setIndex(next);
          setPhase("show");
          armPhase("show", next, SHOW_DURATION_MS);
        }
      }, remainingMs);
    },
    [clearPhaseTimers, deck, playReveal],
  );

  // Boot the loop on mount. Index/phase resets are handled inline by
  // armPhase calls in the timer callbacks.
  useEffect(() => {
    armPhase("show", 0, SHOW_DURATION_MS);
    return () => {
      clearPhaseTimers();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = useCallback(() => {
    if (done) return;
    setPaused((wasPaused) => {
      if (wasPaused) {
        // Resume — re-arm with whatever was left.
        const remaining =
          (phase === "show" ? SHOW_DURATION_MS : REVEAL_DURATION_MS) -
          elapsedAtPauseRef.current;
        armPhase(phase, index, Math.max(50, remaining));
        return false;
      }
      // Pause — record elapsed and tear down timers.
      const phaseTotal =
        phase === "show" ? SHOW_DURATION_MS : REVEAL_DURATION_MS;
      const now = performance.now();
      elapsedAtPauseRef.current = Math.min(
        phaseTotal,
        Math.max(0, now - phaseStartRef.current),
      );
      clearPhaseTimers();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return true;
    });
  }, [armPhase, clearPhaseTimers, done, index, phase]);

  const replayAudio = useCallback(() => {
    if (paused || done) return;
    if (phase === "reveal") {
      playReveal(current);
    }
  }, [current, done, paused, phase, playReveal]);

  // Keyboard: Space (pause), R (replay audio on reveal), Esc (exit).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        // Let Space on a real <button> (e.g. replay pronunciation) use
        // the browser's default activation — don't steal it for pause.
        if (
          e.target instanceof HTMLElement &&
          e.target.closest("button")
        ) {
          return;
        }
        e.preventDefault();
        togglePause();
      } else if (e.code === "KeyR") {
        replayAudio();
      } else if (e.code === "Escape") {
        router.push("/quiz/kana");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [replayAudio, router, togglePause]);

  // Fire-and-forget POST when the user finishes the deck. Idempotent
  // on `sessionKeyRef.current`, so React strict-mode double-invokes,
  // accidental remounts, and network retries all collapse to one
  // server-side row + one quest claim.
  useEffect(() => {
    if (!done) return;
    const key = sessionKeyRef.current;
    if (!key || reportedRef.current === key) return;
    reportedRef.current = key;
    const durationMs = Date.now() - sessionStartRef.current;
    apiFetch("/api/reading/session-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionKey: key,
        stage,
        set,
        cardsShown: total,
        durationMs,
      }),
    }).catch(() => {
      // Non-blocking: the user already finished; we'll catch up on
      // the next session if this one drops. Letting reportedRef stay
      // set means we don't retry-spam from the same mount.
    });
  }, [done, set, stage, total]);

  if (done) {
    return (
      <StageCompleteView
        stage={stage}
        set={set}
        weekdayLabel={weekdayLabel}
        isAutoSet={isAutoSet}
        total={total}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/quiz/kana"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Quiz hub
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <BookOpen className="size-3" />
            {stageMeta.label}
          </Badge>
          <Badge variant="outline">Set {set} of 5</Badge>
          <Badge variant="outline">
            {index + 1} / {total}
          </Badge>
        </div>
      </div>

      <div className="relative h-1 w-full overflow-hidden rounded-full bg-secondary">
        {/* CSS-driven fill — keyed on (phase, index) so React remounts
            the indicator on every transition, restarting the keyframes
            from scaleX(0). animation-duration matches the active phase
            (4s show / 2.5s reveal); animation-play-state pauses the
            visual in lockstep with the JS-side timer teardown. */}
        <div
          key={`${phase}-${index}`}
          className="absolute inset-y-0 left-0 h-full w-full bg-primary animate-reading-progress"
          style={{
            animationDuration: `${phaseTotalMs}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      </div>

      <div className="flex justify-center">
        {/* Must not be a native <button> — the reveal-phase replay control
            is a shadcn <Button> (also a button). Nested buttons are invalid
            HTML and break hydration. */}
        <div
          role="button"
          tabIndex={0}
          onClick={togglePause}
          onKeyDown={(e) => {
            // Space is handled by the window listener so we don't
            // double-toggle; Enter activates this control when it has
            // focus (ARIA role=button).
            if (e.code === "Enter") {
              e.preventDefault();
              togglePause();
            }
          }}
          aria-label={paused ? "Resume" : "Pause"}
          className="block w-full max-w-2xl cursor-pointer rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card
            className={cn(
              "relative overflow-hidden rounded-3xl border bg-card transition-shadow",
              paused && "ring-2 ring-amber-400/40",
            )}
          >
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-6 p-10 sm:p-16">
              <div
                lang="ja"
                className="text-center text-6xl font-medium tracking-wide text-foreground sm:text-8xl"
              >
                {current.display}
              </div>

              {phase === "reveal" && (
                <>
                  <div className="h-px w-full max-w-sm border-t border-dashed border-border" />
                  <div className="space-y-1 text-center">
                    <div className="text-2xl text-muted-foreground sm:text-3xl">
                      {current.romaji}
                    </div>
                    <div className="text-sm italic text-muted-foreground/80 sm:text-base">
                      {current.english}
                    </div>
                  </div>
                </>
              )}

              {phase === "reveal" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    replayAudio();
                  }}
                  aria-label="Replay pronunciation"
                >
                  <Volume2 className="size-4" />
                </Button>
              )}

              {paused && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm">
                    <Pause className="size-3.5" />
                    Paused — press space to resume
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1.5 py-0.5">space</kbd> to
        pause · <kbd className="rounded bg-muted px-1.5 py-0.5">esc</kbd> to
        exit · <kbd className="rounded bg-muted px-1.5 py-0.5">r</kbd> to
        replay audio
      </div>
    </div>
  );
}

function StageCompleteView({
  stage,
  set,
  weekdayLabel,
  isAutoSet,
  total,
}: {
  stage: ReadingStage;
  set: ReadingSet;
  weekdayLabel: string;
  isAutoSet: boolean;
  total: number;
}) {
  const router = useRouter();
  const meta = getReadingStageMeta(stage);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/quiz/kana"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to setup
      </Link>
      <Card className="rounded-3xl">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{meta.label} complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You walked through all {total} {meta.subtitle.replace(/-syllable.*/, "-syllable")} words in
              Set {set}{isAutoSet ? ` (${weekdayLabel})` : ""}.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => router.refresh()}
              className="gap-2"
            >
              <RefreshCw className="size-4" />
              Replay this stage
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/quiz/kana">Pick another stage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
