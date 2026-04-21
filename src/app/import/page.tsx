"use client";

import { useEffect, useMemo, useState } from "react";
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

type Word = {
  id: number;
  romaji: string;
  hiragana: string;
  katakana: string;
  english: string;
  needsReview?: boolean;
  batch?: { id: number; name: string; source: string } | null;
};

export default function ImportPage() {
  const [text, setText] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWords() {
    setLoading(true);
    try {
      const res = await fetch("/api/words");
      const data = await res.json();
      setWords(data.words);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWords();
  }, []);

  // Group words by their batch so the library reads as "Import #1, Import #2,
  // Greetings (N5)" etc. instead of one giant list. Words without a batch
  // (created before the feature) fall into an "Uncategorized" bucket.
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; source: string; words: Word[] }>();
    for (const w of words) {
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
    // Latest batch (by name suffix or just insertion order from the API,
    // which is createdAt desc) appears first.
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [words]);

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
      const res = await fetch("/api/words/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ romaji: lines }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Import failed");
      }
      setText("");
      await loadWords();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
  }

  async function handleSave(id: number, patch: Partial<Word>) {
    await fetch(`/api/words/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadWords();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this word?")) return;
    await fetch(`/api/words/${id}`, { method: "DELETE" });
    await loadWords();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Import romaji</h1>
        <p className="text-muted-foreground">
          One romaji per line, or comma-separated. Hiragana and katakana are
          auto-generated. English meaning is fetched via Google Gemini. Each
          import becomes its own batch ("Import #1", "Import #2") so you can
          study them separately later.
        </p>
      </section>

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
          <Badge variant="secondary">{words.length} words</Badge>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No words yet. Import some to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
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
    </div>
  );
}

function WordRow({
  word,
  onSave,
  onDelete,
}: {
  word: Word;
  onSave: (id: number, patch: Partial<Word>) => void;
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
