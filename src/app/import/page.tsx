"use client";

import { useEffect, useState } from "react";
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
          auto-generated. English meaning is fetched via Google Gemini.
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
        ) : words.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No words yet. Import some to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Romaji</TableHead>
                  <TableHead>Hiragana</TableHead>
                  <TableHead>Katakana</TableHead>
                  <TableHead>English</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {words.map((w) => (
                  <WordRow
                    key={w.id}
                    word={w}
                    onSave={handleSave}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
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
