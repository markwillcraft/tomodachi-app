"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Brush, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { N5_KANJI } from "@/lib/kanji";
import { cn } from "@/lib/utils";

const COUNT_OPTIONS = [10, 20, 30, 50];

// Group N5 kanji into the same 10 rows as the MochiMochi chart so users can
// pick a manageable subset (e.g. just the first 10 numbers).
const KANJI_GROUPS: { label: string; chars: string[] }[] = [
  { label: "Numbers 1-10", chars: ["一","二","三","四","五","六","七","八","九","十"] },
  { label: "Big numbers + nature", chars: ["百","千","万","日","月","火","水","木","金","土"] },
  { label: "People + study", chars: ["本","語","人","女","男","子","友","国","学","校"] },
  { label: "Sizes + time", chars: ["小","大","少","多","時","分","年","名","前","後"] },
  { label: "Geography + directions", chars: ["山","川","花","魚","上","中","下","左","右","外"] },
  { label: "Weather + shop + life", chars: ["雨","電","天","店","手","古","新","買","生","午"] },
  { label: "Body + compass", chars: ["口","入","出","長","高","円","北","南","東","西"] },
  { label: "Eat / drink / senses", chars: ["食","飲","駅","目","見","耳","聞","足","行","来"] },
  { label: "Society + actions", chars: ["社","休","車","道","空","言","話","読","書","立"] },
  { label: "Family + everyday", chars: ["母","父","毎","気","白","何","週","間","半","今"] },
];

export default function KanjiQuizSetupPage() {
  const router = useRouter();
  const [count, setCount] = useState(20);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(
    () => new Set(KANJI_GROUPS.map((_, i) => i)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subsetChars = useMemo(() => {
    const out: string[] = [];
    for (const i of selectedGroups) {
      out.push(...KANJI_GROUPS[i].chars);
    }
    return out;
  }, [selectedGroups]);

  function toggle(idx: number) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function start() {
    if (subsetChars.length === 0) {
      setError("Pick at least one group.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sendingAll = subsetChars.length === N5_KANJI.length;
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          mode: "kanji",
          kanjiChars: sendingAll ? undefined : subsetChars,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start quiz");
      sessionStorage.setItem(
        "quiz",
        JSON.stringify({ mode: "kanji", questions: data.questions }),
      );
      router.push("/quiz/play");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Quiz hub
        </Link>
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Brush className="size-6" />
          <h1 className="text-3xl font-bold tracking-tight">N5 Kanji quiz</h1>
        </div>
        <p className="text-muted-foreground">
          Mixes three question types: kanji → meaning, meaning → kanji, and
          kanji → reading.
        </p>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>
                Tap rows to include them. Defaults to the full N5 set.
              </CardDescription>
            </div>
            <Badge variant="secondary">{subsetChars.length} kanji</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelectedGroups(new Set(KANJI_GROUPS.map((_, i) => i)))
              }
            >
              All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedGroups(new Set())}
            >
              None
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KANJI_GROUPS.map((g, i) => {
              const isOn = selectedGroups.has(i);
              return (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isOn
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-card text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  <div className="font-medium">{g.label}</div>
                  <div className="jp mt-1 text-base text-foreground/80">
                    {g.chars.join("")}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How many questions?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={count === n ? "default" : "outline"}
              onClick={() => setCount(n)}
            >
              {n}
            </Button>
          ))}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={start}
          disabled={loading || subsetChars.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Start quiz
              <Badge variant="secondary" className="ml-2">
                {count}
              </Badge>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
