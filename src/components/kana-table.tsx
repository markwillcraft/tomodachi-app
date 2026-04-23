"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import {
  HIRAGANA,
  KATAKANA,
  type KanaPair,
  type KanaScript,
} from "@/lib/kana";
import { speakJapanese } from "@/lib/speech";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The fixed gojuon layout the textbook uses. Each row is the romaji of
// the cells we want to render; gaps in the y-row and w-row are explicit
// so cells line up vertically with the columns above them.
type RowDef = {
  id: string;
  label: string;
  cells: (string | null)[];
  kind: "gojuon" | "dakuten" | "handakuten";
};

const COLUMN_HEADERS = ["a", "i", "u", "e", "o"] as const;

const GOJUON_ROWS: RowDef[] = [
  { id: "vowel", label: "—", cells: ["a", "i", "u", "e", "o"], kind: "gojuon" },
  { id: "k", label: "k", cells: ["ka", "ki", "ku", "ke", "ko"], kind: "gojuon" },
  { id: "s", label: "s", cells: ["sa", "shi", "su", "se", "so"], kind: "gojuon" },
  { id: "t", label: "t", cells: ["ta", "chi", "tsu", "te", "to"], kind: "gojuon" },
  { id: "n", label: "n", cells: ["na", "ni", "nu", "ne", "no"], kind: "gojuon" },
  { id: "h", label: "h", cells: ["ha", "hi", "fu", "he", "ho"], kind: "gojuon" },
  { id: "m", label: "m", cells: ["ma", "mi", "mu", "me", "mo"], kind: "gojuon" },
  { id: "y", label: "y", cells: ["ya", null, "yu", null, "yo"], kind: "gojuon" },
  { id: "r", label: "r", cells: ["ra", "ri", "ru", "re", "ro"], kind: "gojuon" },
  { id: "w", label: "w", cells: ["wa", null, null, null, "wo"], kind: "gojuon" },
  { id: "n_alone", label: "n", cells: [null, null, "n", null, null], kind: "gojuon" },
];

const DAKUTEN_ROWS: RowDef[] = [
  { id: "g", label: "g", cells: ["ga", "gi", "gu", "ge", "go"], kind: "dakuten" },
  { id: "z", label: "z", cells: ["za", "ji", "zu", "ze", "zo"], kind: "dakuten" },
  { id: "d", label: "d", cells: ["da", null, null, "de", "do"], kind: "dakuten" },
  { id: "b", label: "b", cells: ["ba", "bi", "bu", "be", "bo"], kind: "dakuten" },
];

const HANDAKUTEN_ROWS: RowDef[] = [
  { id: "p", label: "p", cells: ["pa", "pi", "pu", "pe", "po"], kind: "handakuten" },
];

function buildLookup(pairs: KanaPair[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of pairs) if (!m.has(p.romaji)) m.set(p.romaji, p.kana);
  return m;
}

const HIRAGANA_LOOKUP = buildLookup(HIRAGANA);
const KATAKANA_LOOKUP = buildLookup(KATAKANA);

const SCRIPT_TABS: { id: KanaScript; label: string }[] = [
  { id: "hiragana", label: "Hiragana ひらがな" },
  { id: "katakana", label: "Katakana カタカナ" },
  { id: "both", label: "Both" },
];

export function KanaTable() {
  const [script, setScript] = useState<KanaScript>("hiragana");
  const [showRomaji, setShowRomaji] = useState(true);

  const sections = useMemo(
    () => [
      { id: "gojuon", title: "Gojūon — base sounds", rows: GOJUON_ROWS },
      { id: "dakuten", title: "Dakuten ゛ — voiced sounds", rows: DAKUTEN_ROWS },
      {
        id: "handakuten",
        title: "Handakuten ゜ — half-voiced sounds",
        rows: HANDAKUTEN_ROWS,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1">
          {SCRIPT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScript(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                script === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRomaji((v) => !v)}
        >
          {showRomaji ? "Hide romaji" : "Show romaji"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tap any cell to hear it pronounced. Hover/click cells to drill the
        sound until the kana → sound mapping is automatic.
      </p>

      {sections.map((sec) => (
        <section key={sec.id} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {sec.title}
          </h3>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full table-fixed border-collapse text-center">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-12 py-2 text-xs font-semibold text-muted-foreground">
                    {/* row label header */}
                  </th>
                  {COLUMN_HEADERS.map((c) => (
                    <th
                      key={c}
                      className="py-2 text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <th className="bg-muted/20 py-2 text-xs font-semibold text-muted-foreground">
                      {row.label}
                    </th>
                    {row.cells.map((romaji, ci) => (
                      <td key={ci} className="border-l p-1.5 sm:p-2">
                        {romaji ? (
                          <KanaCell
                            romaji={romaji}
                            script={script}
                            showRomaji={showRomaji}
                          />
                        ) : (
                          <span className="block size-full" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function KanaCell({
  romaji,
  script,
  showRomaji,
}: {
  romaji: string;
  script: KanaScript;
  showRomaji: boolean;
}) {
  const hira = HIRAGANA_LOOKUP.get(romaji);
  const kata = KATAKANA_LOOKUP.get(romaji);

  const speakable =
    script === "katakana" ? (kata ?? hira) : (hira ?? kata);

  if (!speakable) return null;

  function handleTap() {
    speakJapanese(speakable!);
    // Fire-and-forget: log a soft "studied" signal for each character
    // so the N5 mastery modal can mark items as "Started" before the
    // user has been quizzed on them. Send both scripts when "both" is
    // active so a single tap counts for both glyphs the cell shows.
    const targets =
      script === "both"
        ? [hira, kata].filter((s): s is string => Boolean(s))
        : [speakable!];
    for (const t of targets) {
      void fetch("/api/kana/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kana: t }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className="group flex w-full flex-col items-center justify-center gap-0.5 rounded-md py-2 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`Play ${romaji}`}
      title={`Play ${romaji}`}
    >
      {script === "both" ? (
        <span className="jp flex items-baseline justify-center gap-1.5 text-2xl sm:text-3xl">
          <span>{hira ?? "—"}</span>
          <span className="text-muted-foreground/70">·</span>
          <span>{kata ?? "—"}</span>
        </span>
      ) : (
        <span className="jp text-3xl sm:text-4xl">
          {script === "katakana" ? (kata ?? "—") : (hira ?? "—")}
        </span>
      )}
      {showRomaji && (
        <span className="font-mono text-[11px] text-muted-foreground sm:text-xs">
          {romaji}
        </span>
      )}
      <Volume2 className="size-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
