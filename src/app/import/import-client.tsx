"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/lib/utils";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";

export type ImportWord = {
  id: number;
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  batch?: { id: number; name: string; source: string } | null;
};

export function ImportClient({
  initialWords,
}: {
  initialWords: ImportWord[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `useTransition` keeps the UI responsive during `router.refresh()`
  // — the list smoothly updates instead of locking inputs.
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  // Group words by their batch so the library reads as "Import #1,
  // Import #2, Greetings (N5)" etc. instead of one giant list.
  // Words without a batch (created before the feature) fall into
  // an "Uncategorized" bucket.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; source: string; words: ImportWord[] }
    >();
    for (const w of initialWords) {
      const key = w.batch ? `b:${w.batch.id}` : "none";
      const existing = map.get(key);
      if (existing) {
        existing.words.push(w);
      } else {
        map.set(key, {
          name: w.batch?.name ?? "Uncategorized",
          source: w.batch?.source ?? "",
          words: [w],
        });
      }
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [initialWords]);

  async function handleImport() {
    setError(null);
    const lines = text
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError("Add at least one romaji entry.");
      return;
    }
    setImporting(true);
    try {
      await apiFetch("/api/words/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ romaji: lines }),
      });
      setText("");
      refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Import failed"));
    } finally {
      setImporting(false);
    }
  }

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
  }

  async function handleSave(id: number, patch: Partial<ImportWord>) {
    try {
      await apiFetch(`/api/words/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Save failed"));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this word?")) return;
    try {
      await apiFetch(`/api/words/${id}`, { method: "DELETE" });
      refresh();
    } catch (e) {
      setError(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add words</CardTitle>
          <CardDescription>
            Paste romaji or upload a .txt file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"watashi\nminasan\nsensei\ngakusei"}
            rows={8}
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer">
                <Upload />
                Upload .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="animate-spin" />}
              {importing ? "Enriching with Gemini…" : "Import & enrich"}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your library</h2>
          <Badge variant="secondary">{initialWords.length} words</Badge>
        </div>

        {grouped.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No words yet. Import some to get started.
            </CardContent>
          </Card>
        ) : (
          <div
            className={cn(
              "space-y-6 transition-opacity",
              isPending && "opacity-60",
            )}
          >
            {grouped.map((g) => (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <CardDescription>
                      {g.source === "category"
                        ? "From N5 categories"
                        : g.source === "import"
                          ? "Manual import"
                          : "Older words (no batch)"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{g.words.length} words</Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Romaji</TableHead>
                        <TableHead>Hiragana</TableHead>
                        <TableHead>Katakana</TableHead>
                        <TableHead>English</TableHead>
                        <TableHead className="w-32 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.words.map((w) => (
                        <WordRow
                          key={w.id}
                          word={w}
                          onSave={handleSave}
                          onDelete={handleDelete}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function WordRow({
  word,
  onSave,
  onDelete,
}: {
  word: ImportWord;
  onSave: (id: number, patch: Partial<ImportWord>) => void;
  onDelete: (id: number) => void;
}) {
  const [hiragana, setHiragana] = useState(word.hiragana);
  const [katakana, setKatakana] = useState(word.katakana);
  const [english, setEnglish] = useState(word.english);
  const dirty =
    hiragana !== word.hiragana ||
    katakana !== word.katakana ||
    english !== word.english;

  return (
    <TableRow>
      <TableCell className="font-mono">{word.romaji}</TableCell>
      <TableCell className="jp">
        <Input
          value={hiragana}
          onChange={(e) => setHiragana(e.target.value)}
          className="h-8"
        />
      </TableCell>
      <TableCell className="jp">
        <Input
          value={katakana}
          onChange={(e) => setKatakana(e.target.value)}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder={word.english.length === 0 ? "needs review" : ""}
          className={cn(
            "h-8",
            english.length === 0 && "ring-2 ring-warning/50",
          )}
        />
      </TableCell>
      <TableCell className="text-right space-x-1">
        {dirty && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSave(word.id, { hiragana, katakana, english })}
          >
            <Save />
            Save
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(word.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}

