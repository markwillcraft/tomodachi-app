"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
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
import { apiErrorMessage, apiFetch } from "@/lib/api-client";

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
  // Anki-style focus mode: opens the deck in a native <dialog> that fills
  // the viewport, sets `touch-action: none` on the card so horizontal swipes
  // don't bleed into page scroll, and (best-effort) requests browser
  // fullscreen to hide the URL bar / OS chrome. Manual entry via the bottom
  // action row's Focus button; Esc + the in-dialog X exit. Scope is
  // deliberately small — the entire lifecycle (showModal, body lock,
  // requestFullscreen + their inverses) collapses into the dialog's
  // ref-callback below, so no useEffect is required for any of it.
  const [isFocus, setIsFocus] = useState(false);
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
  // Lower axis-lock threshold (was 8) so inline-mode swipes commit to the
  // horizontal axis sooner, reducing the few-pixels-of-vertical-scroll
  // bleed before pointer capture engages. Focus mode dodges this entirely
  // via `touch-action: none`, but this helps users who never enter it.
  const SWIPE_AXIS_LOCK_PX = 5;

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
      // `apiFetch` so the 25/50/100 vocab milestone (and any daily
      // quest the view completes) auto-dispatches its toast +
      // bell-refresh through the notification bus. We still swallow
      // failures (including 429s) so a rate-limited or offline
      // burst doesn't break the study UI — the only consequence is
      // the mastery modal not advancing this card to "Started"
      // until the user re-views.
      await apiFetch("/api/cards/view", {
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

  // Shared swipe-zone interaction props. We hoist these into a single
  // object so the inline wrapper and the focus-mode body div both spread
  // the same gesture/click/key handlers — keeping them in sync without
  // duplicating logic. The visual card itself is "passive" (just transform
  // and styling); the wrapper is what catches taps and drags. That's what
  // lets focus mode extend the swipe zone *beyond* the card's visual
  // bounds — users on iPad / wide phones can drag from any empty space
  // around the card and still navigate.
  const swipeProps = {
    role: "button" as const,
    tabIndex: 0,
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
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
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (editing) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    },
    onPointerDown,
    onPointerMove,
    onPointerUp: endSwipe,
    onPointerCancel: endSwipe,
  };

  // Visual card. Carries the swipe `transform`, the flippable colors,
  // the absolutely-positioned children (Romaji / Translation badge,
  // Edit + Volume buttons, Prev / Next swipe-direction badges), and the
  // mode-conditional sizing — `min-h-[320px]` inline (current look) vs
  // `h-full` in focus mode (so the card visually consumes the body
  // area, matching Anki / Quizlet's fullscreen card feel). Renders
  // inside the appropriate swipe-zone wrapper for each mode.
  const cardVisual = (
    <div
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
      }}
      className={cn(
        "group relative flex w-full max-w-2xl select-none flex-col items-center justify-center rounded-2xl border-2 p-10 text-center shadow-sm",
        isFocus ? "h-full" : "min-h-[320px]",
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
  );

  // Inline-mode swipe zone — wraps the card visual with no extra padding
  // so the swipe footprint matches the card exactly (current look,
  // unchanged). `touch-action: pan-y` keeps the page vertically
  // scrollable while the card is mid-page.
  const cardSurface = (
    <div
      {...swipeProps}
      style={{ touchAction: "pan-y" }}
      className="mx-auto block w-full max-w-2xl"
    >
      {cardVisual}
    </div>
  );

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

      {/* Render the card inline only when NOT in focus mode — otherwise
          the focus dialog below owns it, and we don't want two copies of
          the same handlers in the DOM. */}
      {!isFocus && cardSurface}

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
        <Button
          variant="ghost"
          onClick={() => setIsFocus(true)}
          aria-label="Enter focus mode"
        >
          <Maximize2 />
          Focus
        </Button>
        <Button onClick={next} disabled={index + 1 >= total}>
          Next
          <ChevronRight />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Swipe the card left / right to navigate (or use ← / →). Tap or press
        space to flip, P to play audio · Pencil icon to fix wrong romaji.
        Tap <span className="font-semibold">Focus</span> for fullscreen.
      </p>

      {/* Focus mode overlay. Native <dialog> in the top layer (no z-index
          wrangling), with Esc handled by the browser via cancel→close, and
          a ref-callback that performs the entire side-effect lifecycle:
          showModal + body lock + best-effort fullscreen on mount, and
          their inverses on unmount. React 19 ref-callback cleanups make
          this useEffect-free. */}
      {isFocus && (
        <dialog
          ref={(node) => {
            if (!node) return;
            node.showModal();
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            void node.requestFullscreen?.().catch(() => {
              // iOS Safari only supports requestFullscreen on <video>; the
              // dialog alone delivers the immersive experience there.
            });
            return () => {
              document.body.style.overflow = previousOverflow;
              if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => {});
              }
            };
          }}
          onClose={() => setIsFocus(false)}
          className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-background p-0 text-foreground backdrop:bg-black/80"
        >
          {/* Three-zone layout: header / body (swipe zone) / footer.
              Vertical padding respects iOS safe areas (notch on top,
              home indicator on bottom). Horizontal padding uses
              `px-4 sm:px-6`. The body row spreads the swipe handlers,
              so the *entire body area* is swipeable / tappable — not
              just the card surface itself. The bordered header and
              footer rows visually wall off the controls so the user
              knows those zones aren't part of the gesture area. */}
          <div
            className="flex h-full flex-col px-4 sm:px-6"
            style={{
              paddingTop: "max(1.5rem, calc(env(safe-area-inset-top) + 0.5rem))",
              paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
            }}
          >
            {/* Header — full-width bottom border separates it from the
                swipe zone below. Inner content is constrained to the
                card's max-width so the counter and X line up with the
                card visual. */}
            <div className="border-b border-border pb-3">
              <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Card {index + 1} / {total}
                  </span>
                  {current.batchName && (
                    <Badge variant="outline">{current.batchName}</Badge>
                  )}
                  <span className="text-muted-foreground">
                    Today:{" "}
                    <span className="font-semibold text-foreground">
                      {todayCount}/{dailyCardGoal}
                    </span>{" "}
                    ({pct}%)
                  </span>
                  {logging && (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Exit focus mode"
                  onClick={() => setIsFocus(false)}
                  className="size-9 p-0"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            {/* Body — the swipe zone. Spreads the same `swipeProps`
                that the inline wrapper uses, but extends *beyond* the
                card visual: the empty space above, below, and to the
                sides of the card all participate in the gesture, so
                users on tablets / wide phones get a generous drag
                surface. `touch-action: none` blocks vertical scroll
                bleed since the dialog body has nothing to scroll. */}
            <div
              {...swipeProps}
              style={{ touchAction: "none" }}
              className="flex w-full flex-1 cursor-grab items-center justify-center py-4 active:cursor-grabbing"
            >
              {cardVisual}
            </div>

            {/* Footer — full-width top border separates it from the
                swipe zone above. Three equal-width buttons in a tight,
                centered band (max-w-md ≈ 448px). A 3-column grid is
                the only layout that's actually responsive across the
                full phone-to-desktop range: justify-between leaves
                dead air in the middle on tablets/desktops,
                justify-center clumps them too tightly on narrow
                phones. The grid gives the buttons predictable equal
                width regardless of viewport, matching the Anki /
                Quizlet bottom-row pattern. */}
            <div className="border-t border-border pt-3">
              <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={prev}
                  disabled={index === 0}
                  aria-label="Previous card"
                  className="w-full"
                >
                  <ChevronLeft />
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  onClick={flip}
                  aria-label="Flip card"
                  className="w-full"
                >
                  <Repeat />
                  Flip
                </Button>
                <Button
                  onClick={next}
                  disabled={index + 1 >= total}
                  className="w-full"
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </dialog>
      )}
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
      const data = await apiFetch<{ word: StudyWord }>(
        `/api/words/${word.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            romaji: romaji.trim().toLowerCase(),
            english: english.trim(),
          }),
        },
      );
      onSaved({
        ...word,
        romaji: data.word.romaji,
        hiragana: data.word.hiragana,
        katakana: data.word.katakana,
        english: data.word.english,
      });
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save"));
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
