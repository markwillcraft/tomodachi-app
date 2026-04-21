"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MiniKanji = {
  char: string;
  meaning: string;
  on: string[];
  kun: string[];
};

export function KanjiSearch({ allKanji }: { allKanji: MiniKanji[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return allKanji
      .filter((k) => {
        if (k.char.includes(q)) return true;
        if (k.meaning.toLowerCase().includes(q)) return true;
        if (k.on.some((o) => o.toLowerCase().includes(q))) return true;
        if (k.kun.some((u) => u.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 24);
  }, [query, allKanji]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by kanji, meaning, or reading (e.g. 'water', 'hi', 'tomo')"
          className="pl-9 pr-9"
        />
        {query.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2 p-0"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {query.length > 0 && (
        <div
          className={cn(
            "rounded-xl border bg-card p-3",
            results.length === 0 && "text-center text-sm text-muted-foreground",
          )}
        >
          {results.length === 0 ? (
            <span>No kanji match &ldquo;{query}&rdquo;.</span>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {results.map((k) => (
                <Link
                  key={k.char}
                  href={`/study/kanji/${encodeURIComponent(k.char)}`}
                  className="flex flex-col items-center gap-0.5 rounded-lg border p-2 hover:border-primary/50 hover:bg-accent/40"
                  title={k.meaning}
                >
                  <span className="jp text-2xl font-bold">{k.char}</span>
                  <span className="line-clamp-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {k.meaning.split(",")[0]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
