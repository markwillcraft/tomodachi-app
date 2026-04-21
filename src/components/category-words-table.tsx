"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  PlusSquare,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { speakJapanese } from "@/lib/speech";
import { cn } from "@/lib/utils";

type WordExample = {
  jp: string;
  romaji: string;
  english: string;
};

type Word = {
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  examples?: WordExample[];
};

export function CategoryWordsTable({
  slug,
  words,
  initialOwnedRomaji,
}: {
  slug: string;
  words: Word[];
  initialOwnedRomaji: string[];
}) {
  const [owned, setOwned] = useState<Set<string>>(
    () => new Set(initialOwnedRomaji.map((r) => r.toLowerCase())),
  );
  const [busyRomaji, setBusyRomaji] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const remaining = useMemo(
    () => words.filter((w) => !owned.has(w.romaji.toLowerCase())),
    [words, owned],
  );

  function toggleExpanded(romaji: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(romaji)) next.delete(romaji);
      else next.add(romaji);
      return next;
    });
  }

  async function addOne(word: Word) {
    setBusyRomaji(word.romaji);
    setError(null);
    try {
      const res = await fetch("/api/categories/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, romaji: [word.romaji] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not add word");
      }
      setOwned((prev) => {
        const next = new Set(prev);
        next.add(word.romaji.toLowerCase());
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyRomaji(null);
    }
  }

  async function addAllRemaining() {
    if (remaining.length === 0) return;
    setBusyAll(true);
    setError(null);
    try {
      const res = await fetch("/api/categories/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          romaji: remaining.map((w) => w.romaji),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not add words");
      }
      setOwned((prev) => {
        const next = new Set(prev);
        for (const w of remaining) next.add(w.romaji.toLowerCase());
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Words</CardTitle>
          <Button
            size="sm"
            onClick={addAllRemaining}
            disabled={busyAll || remaining.length === 0}
          >
            {busyAll ? (
              <Loader2 className="animate-spin" />
            ) : (
              <PlusSquare />
            )}
            {remaining.length === 0
              ? "All added"
              : `Add all ${remaining.length} remaining`}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Romaji</TableHead>
                <TableHead>Hiragana</TableHead>
                <TableHead>Katakana</TableHead>
                <TableHead>English</TableHead>
                <TableHead className="w-32 text-right">Vocab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.map((w) => {
                const isOwned = owned.has(w.romaji.toLowerCase());
                const isBusy = busyRomaji === w.romaji;
                const hasExamples = !!w.examples && w.examples.length > 0;
                const isOpen = expanded.has(w.romaji);
                return (
                  <Fragment key={w.romaji}>
                    <TableRow
                      className={cn(hasExamples && "cursor-pointer")}
                      onClick={() =>
                        hasExamples && toggleExpanded(w.romaji)
                      }
                    >
                      <TableCell className="w-8 align-middle">
                        {hasExamples ? (
                          <ChevronDown
                            className={cn(
                              "size-4 text-muted-foreground transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        ) : (
                          <span className="inline-block size-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{w.romaji}</TableCell>
                      <TableCell className="jp">{w.hiragana}</TableCell>
                      <TableCell className="jp">{w.katakana}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.english}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isOwned ? (
                          <Badge variant="success" className="gap-1">
                            <Check className="size-3" />
                            Added
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addOne(w)}
                            disabled={isBusy || busyAll}
                          >
                            {isBusy ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Plus />
                            )}
                            Add
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {hasExamples && isOpen && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={5} className="py-4">
                          <ExampleList
                            examples={w.examples!}
                            wordKana={w.hiragana}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Renders an N5-grammar example sentence list. Each sentence has a
// dedicated speaker button; tapping the JP text or the speaker plays
// the sentence. The target word (passed as `wordKana`) is highlighted
// inside each sentence so learners see exactly where it appears.
function ExampleList({
  examples,
  wordKana,
}: {
  examples: WordExample[];
  wordKana: string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        N5 example {examples.length > 1 ? "sentences" : "sentence"}
      </div>
      <ul className="space-y-3">
        {examples.map((ex, i) => (
          <li
            key={i}
            className="rounded-lg border bg-background/60 p-3 backdrop-blur-sm"
          >
            <div className="flex items-start gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speakJapanese(ex.jp)}
                aria-label="Play sentence"
                className="size-8 shrink-0 p-0"
              >
                <Volume2 className="size-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => speakJapanese(ex.jp)}
                  className="jp block w-full text-left text-lg leading-relaxed transition-colors hover:text-primary sm:text-xl"
                >
                  {highlightWord(ex.jp, wordKana)}
                </button>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {ex.romaji}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {ex.english}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Wrap the first occurrence of `needle` (a hiragana/katakana form of the
// vocab word) in a colored span so learners can spot the target word at
// a glance. Falls back to the plain string if it isn't present.
function highlightWord(haystack: string, needle: string) {
  if (!needle) return haystack;
  const idx = haystack.indexOf(needle);
  if (idx === -1) return haystack;
  return (
    <>
      {haystack.slice(0, idx)}
      <span className="rounded bg-primary/15 px-1 font-bold text-primary">
        {needle}
      </span>
      {haystack.slice(idx + needle.length)}
    </>
  );
}
