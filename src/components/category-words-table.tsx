"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, PlusSquare } from "lucide-react";
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

type Word = {
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
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

  const remaining = useMemo(
    () => words.filter((w) => !owned.has(w.romaji.toLowerCase())),
    [words, owned],
  );

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
                return (
                  <TableRow key={w.romaji}>
                    <TableCell className="font-mono">{w.romaji}</TableCell>
                    <TableCell className="jp">{w.hiragana}</TableCell>
                    <TableCell className="jp">{w.katakana}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.english}
                    </TableCell>
                    <TableCell className="text-right">
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
