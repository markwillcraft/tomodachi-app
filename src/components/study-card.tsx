"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Repeat,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { hasJapaneseVoiceInstalled, speakJapanese } from "@/lib/speech";

export type StudyWord = {
  id: number;
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  batchName?: string | null;
};

export function StudyCardDeck({
  words: initialWords,
  initialViewedIds,
  dailyCardGoal,
  initialIndex = 0,
}: {
  words: StudyWord[];
  initialViewedIds: number[];
  dailyCardGoal: number;
  initialIndex?: number;
}) {
  const [words, setWords] = useState<StudyWord[]>(initialWords);
  const [index, setIndex] = useState(() => {
    if (!Number.isFinite(initialIndex)) return 0;
    return Math.max(0, Math.min(initialIndex, Math.max(0, initialWords.length - 1)));
  });
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [voiceWarning, setVoiceWarning] = useState(false);
  const [viewed, setViewed] = useState<Set<number>>(
    () => new Set(initialViewedIds),
  );
  const [logging, setLogging] = useState(false);
  const seenThisSession = useRef<Set<number>>(new Set(initialViewedIds));

  const total = words.length;
  const current: StudyWord | undefined = words[index];

  // ----- Swipe / drag gesture state -----------------------------------
  // We let users swipe the card horizontally on touch (and click-drag on
  // desktop) to navigate, mimicking Anki / Tinder. Vertical motion is
  // ignored so the page can still scroll. We track the gesture in a
  // ref so the live transform doesn't trigger React re-renders on
  // every pointer move; only the final commit / cancel sets state.
  const swipeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    pointerId: number | null;
    locked: "h" | "v" | null;
  }>({ active: false, startX: 0, startY: 0, pointerId: null, locked: null });
  const [dragX, setDragX] = useState(0);
  const [committing, setCommitting] = useState<"left" | "right" | null>(null);
  const SWIPE_COMMIT_PX = 90;
  const SWIPE_AXIS_LOCK_PX = 8;

  // Detect if the user has any Japanese voice installed. We don't block
  // anything — just surface a one-time hint so they understand why the
  // audio sounds wrong if they're on a system with no Japanese TTS pack.
  useEffect(() => {
    function check() {
      setVoiceWarning(!hasJapaneseVoiceInstalled());
    }
    check();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", check);
      return () =>
        window.speechSynthesis.removeEventListener("voiceschanged", check);
    }
  }, []);

  // Keyboard nav: ←/→ to move, space to flip, P to play audio.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing) return;
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
      if (e.key === "p" || e.key === "P") {
        if (current) speak(current.hiragana, current.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current, editing]);

  // Reset the editor when the visible card changes.
  useEffect(() => {
    setEditing(false);
  }, [index]);

  // Auto-mark the visible card as Started after a short dwell. Mirrors
  // the kanji deck's behavior so simply browsing the stack registers
  // progress even without flipping or audio playback. The dedup logic
  // in `logView` keeps this from spamming the API for fast scrolls.
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => void logView(current.id), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  function speak(text: string, wordId?: number) {
    speakJapanese(text);
    // Listening to a card counts as "viewing" it for the purpose of
    // marking the word as Started in the N5 mastery modal. We fire
    // and forget; the dedup logic in `logView` keeps repeat audio
    // taps from spamming the API.
    if (typeof wordId === "number") void logView(wordId);
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

  // ----- Pointer handlers for swipe nav -------------------------------
  // Pointer events unify mouse/touch/stylus. We capture the pointer
  // once we're sure the gesture is horizontal so the browser doesn't
  // hijack it for scrolling, but we *don't* preventDefault until that
  // axis lock so vertical scroll still works inside the card region.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (editing) return;
    // Don't start a swipe from interactive children (audio / edit
    // buttons set their own stopPropagation, but be defensive).
    if (e.button !== undefined && e.button !== 0) return;
    swipeRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      locked: null,
    };
    setDragX(0);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = swipeRef.current;
    if (!s.active || s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (s.locked === null) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      // Wait until the user has clearly moved before deciding the axis
      // — otherwise tiny tap jitters lock to horizontal and prevent
      // the click from registering as a flip.
      if (adx < SWIPE_AXIS_LOCK_PX && ady < SWIPE_AXIS_LOCK_PX) return;
      s.locked = adx > ady ? "h" : "v";
      if (s.locked === "h") {
        // Capture so we keep getting move/up events even if the
        // pointer leaves the card bounds mid-swipe.
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
      }
    }
    if (s.locked === "h") {
      // Add resistance at edges so it's clear there's nowhere to go.
      let damped = dx;
      if ((dx < 0 && index + 1 >= total) || (dx > 0 && index <= 0)) {
        damped = dx * 0.35;
      }
      setDragX(damped);
    }
  }

  function endSwipe(e: React.PointerEvent<HTMLDivElement>) {
    const s = swipeRef.current;
    if (!s.active || s.pointerId !== e.pointerId) return;
    const wasHorizontal = s.locked === "h";
    const dx = dragX;
    swipeRef.current = {
      active: false,
      startX: 0,
      startY: 0,
      pointerId: null,
      locked: null,
    };
    if (!wasHorizontal) {
      // Vertical / no-lock end: nothing to do — let click/flip fire.
      return;
    }
    // Horizontal release: commit if past threshold, otherwise spring back.
    if (dx <= -SWIPE_COMMIT_PX && index + 1 < total) {
      setCommitting("left");
      // Slide the card off-screen, then advance on next tick so the
      // new card animates in from the dragX=0 position.
      window.setTimeout(() => {
        next();
        setCommitting(null);
        setDragX(0);
      }, 160);
    } else if (dx >= SWIPE_COMMIT_PX && index > 0) {
      setCommitting("right");
      window.setTimeout(() => {
        prev();
        setCommitting(null);
        setDragX(0);
      }, 160);
    } else {
      // Snap back.
      setDragX(0);
    }
  }

  function flip() {
    if (editing) return;
    setFlipped((f) => !f);
    if (current) void logView(current.id);
  }

  function applyUpdate(updated: StudyWord) {
    setWords((prev) =>
      prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)),
    );
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
  const currentViewed = viewed.has(current.id);

  return (
    <div className="space-y-6">
      {voiceWarning && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            No Japanese voice is installed on your device, so audio will fall
            back to your default voice and may sound wrong. On macOS install
            one in <em>System Settings → Accessibility → Spoken Content →
            System voice → Manage Voices</em> (look for Kyoko). On Windows
            install a Japanese language pack.
          </AlertDescription>
        </Alert>
      )}

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
        onClick={(e) => {
          // Suppress click->flip if this was the tail end of a swipe.
          if (committing !== null) {
            e.preventDefault();
            return;
          }
          if (Math.abs(dragX) > 6) {
            e.preventDefault();
            return;
          }
          flip();
        }}
        onKeyDown={(e) => {
          if (editing) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        style={{
          transform: committing
            ? `translateX(${committing === "left" ? "-120%" : "120%"}) rotate(${committing === "left" ? -8 : 8}deg)`
            : `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
          transition:
            committing !== null
              ? "transform 160ms ease-out, opacity 160ms ease-out"
              : swipeRef.current.active
                ? "none"
                : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: committing !== null ? 0 : 1,
          touchAction: "pan-y",
        }}
        className={cn(
          "group relative mx-auto flex min-h-[320px] w-full max-w-2xl select-none flex-col items-center justify-center rounded-2xl border-2 p-10 text-center shadow-sm",
          editing ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          flipped
            ? "border-primary/40 bg-gradient-to-br from-primary/5 to-accent/30"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        {editing ? (
          <EditForm
            word={current}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              applyUpdate(updated);
              setEditing(false);
            }}
          />
        ) : !flipped ? (
          <>
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <Badge variant="outline">Romaji</Badge>
              {currentViewed && (
                <Badge
                  variant="success"
                  className="gap-1"
                  title="You've already viewed this card today"
                >
                  <CheckCircle2 className="size-3" />
                  Viewed
                </Badge>
              )}
            </div>
            <div className="text-5xl font-bold tracking-tight sm:text-6xl">
              {capitalize(current.romaji)}
            </div>
            <div className="mt-6 text-sm text-muted-foreground">
              Tap card or press space to flip
            </div>
          </>
        ) : (
          <>
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <Badge variant="secondary">Translation</Badge>
              {currentViewed && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Viewed
                </Badge>
              )}
            </div>
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

        {!editing && (
          <div className="absolute right-3 top-3 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Edit card"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="size-9 p-0"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Play pronunciation"
              onClick={(e) => {
                e.stopPropagation();
                speak(current.hiragana, current.id);
              }}
              className="size-10 p-0"
            >
              <Volume2 className="size-5" />
            </Button>
          </div>
        )}

        {/* Swipe direction badges. They fade in proportionally to drag
            distance and pulse to "ready" once the user has crossed the
            commit threshold. Pointer-events:none so they never steal
            taps from the underlying card. */}
        {!editing && (
          <>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                dragX >= SWIPE_COMMIT_PX
                  ? "border-primary bg-primary text-primary-foreground scale-110"
                  : "border-border bg-background/80 text-muted-foreground",
              )}
              style={{
                opacity: Math.max(0, Math.min(1, dragX / SWIPE_COMMIT_PX)),
              }}
            >
              ← Prev
            </div>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                dragX <= -SWIPE_COMMIT_PX
                  ? "border-primary bg-primary text-primary-foreground scale-110"
                  : "border-border bg-background/80 text-muted-foreground",
              )}
              style={{
                opacity: Math.max(0, Math.min(1, -dragX / SWIPE_COMMIT_PX)),
              }}
            >
              Next →
            </div>
          </>
        )}
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
        <Button variant="ghost" onClick={flip}>
          <Repeat />
          Flip
        </Button>
        <Button onClick={next} disabled={index + 1 >= total}>
          Next
          <ChevronRight />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Swipe the card left / right to navigate (or use ← / →). Tap or press
        space to flip, P to play audio · Pencil icon to fix wrong romaji.
      </p>
    </div>
  );
}

function EditForm({
  word,
  onCancel,
  onSaved,
}: {
  word: StudyWord;
  onCancel: () => void;
  onSaved: (updated: StudyWord) => void;
}) {
  const [romaji, setRomaji] = useState(word.romaji);
  const [english, setEnglish] = useState(word.english);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (romaji.trim().length === 0) {
      setError("Romaji can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          romaji: romaji.trim().toLowerCase(),
          english: english.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onSaved({
        ...word,
        romaji: data.word.romaji,
        hiragana: data.word.hiragana,
        katakana: data.word.katakana,
        english: data.word.english,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="w-full space-y-4 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <Badge variant="outline">Editing</Badge>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Close edit"
          onClick={onCancel}
          className="size-8 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Romaji
        </label>
        <Input
          value={romaji}
          onChange={(e) => setRomaji(e.target.value)}
          placeholder="e.g. kara kimashita"
          autoFocus
          className="text-lg"
        />
        <p className="text-xs text-muted-foreground">
          Hiragana and katakana will be re-derived automatically when you save.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          English meaning
        </label>
        <Input
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="e.g. (I) came from"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
