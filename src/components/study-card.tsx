"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
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
}: {
  words: StudyWord[];
  initialViewedIds: number[];
  dailyCardGoal: number;
}) {
  const [words, setWords] = useState<StudyWord[]>(initialWords);
  const [index, setIndex] = useState(0);
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
        setFlipped((f) => !f);
      }
      if (e.key === "p" || e.key === "P") {
        if (current) speak(current.hiragana);
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
        onClick={flip}
        onKeyDown={(e) => {
          if (editing) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}
        className={cn(
          "group relative mx-auto flex min-h-[320px] w-full max-w-2xl select-none flex-col items-center justify-center rounded-2xl border-2 p-10 text-center shadow-sm transition-all",
          editing ? "cursor-default" : "cursor-pointer",
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
                speak(current.hiragana);
                void logView(current.id);
              }}
              className="size-10 p-0"
            >
              <Volume2 className="size-5" />
            </Button>
          </div>
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
        Shortcuts: ← / → to navigate, space to flip, P to play audio · Pencil
        icon to fix wrong romaji
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
