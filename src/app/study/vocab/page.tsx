import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StudyCardDeck, type StudyWord } from "@/components/study-card";
import { DAILY_CARD_GOAL } from "@/lib/streak";
import { getUserTimezone, localDayKey, localMidnight } from "@/lib/time";

export const dynamic = "force-dynamic";

// Simple djb2-ish hash so we can turn "userId+date+batch" into a seed for
// a deterministic daily shuffle. Same seed on the same day => same order.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let rng = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    const j = rng % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default async function StudyVocabPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; source?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const sp = await searchParams;
  const rawBatchId = sp.batch ? Number(sp.batch) : null;
  const batchId =
    rawBatchId !== null && Number.isFinite(rawBatchId) ? rawBatchId : null;
  // "Imported Words" is defined by *exclusion* — it means every word the
  // user owns that *isn't* part of a named category pack. That covers two
  // populations the user thinks of as the same thing:
  //   1. Words assigned to a `source: "import"` batch (manual romaji
  //      paste / upload from /import).
  //   2. Pre-feature orphans where `batchId IS NULL` — the schema
  //      explicitly allows this for words that predate the import-batch
  //      model.
  // Matching by the inverse of `source: "category"` (rather than
  // `source: "import"`) means any future `source` value (e.g. "lesson")
  // automatically falls into Imported Words too. `?source=import` and
  // `?batch=N` are mutually exclusive; `?batch` wins if both are sent.
  const sourceFilter =
    !batchId && sp.source === "import" ? ("import" as const) : null;

  const words = await prisma.word.findMany({
    where: {
      userId,
      ...(batchId ? { batchId } : {}),
      ...(sourceFilter
        ? {
            OR: [
              { batchId: null },
              { batch: { source: { not: "category" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { batch: { select: { id: true, name: true } } },
  });

  // Build today's already-viewed set so the StudyCardDeck reflects current
  // streak progress on first load. Day boundary is the user's *local*
  // midnight — the same one getStreak() and the coin summary use —
  // otherwise the counter stays anchored to UTC and shows yesterday's
  // tallies for up to 24h in the user's real timezone.
  const now = new Date();
  const tz = await getUserTimezone(userId);
  const startOfDay = localMidnight(now, tz);
  const todayViews = await prisma.cardView.findMany({
    where: { userId, createdAt: { gte: startOfDay } },
    select: { wordId: true },
  });
  const initialViewedIds = Array.from(
    new Set(todayViews.map((v) => v.wordId)),
  );

  // Deterministic daily shuffle: same seed for the whole day so reloads
  // don't scramble the order, but next day gives a fresh ordering. Key
  // off the local day so the shuffle rotates at the user's midnight,
  // not UTC's. The filter is part of the seed so each chip gets its own
  // stable order — switching from "All" to "Common Verbs" gives a fresh
  // (but deterministic-for-today) sequence rather than a sub-shuffle of
  // the all-deck order.
  const todayKey = localDayKey(now, tz);
  const filterKey = batchId
    ? `batch=${batchId}`
    : sourceFilter
      ? `source=${sourceFilter}`
      : "all";
  const seed = hashString(`${userId}::${todayKey}::${filterKey}`);
  const shuffled = seededShuffle(words, seed);

  const studyWords: StudyWord[] = shuffled.map((w) => ({
    id: w.id,
    romaji: w.romaji,
    hiragana: w.hiragana,
    katakana: w.katakana,
    english: w.english,
    batchName: w.batch?.name ?? null,
  }));

  // Resume from the first card the user hasn't viewed yet today so they
  // aren't stuck clicking "Next" through cards they already drilled.
  const viewedSet = new Set(initialViewedIds);
  let startIndex = studyWords.findIndex((w) => !viewedSet.has(w.id));
  if (startIndex === -1) startIndex = 0;

  const [batches, totalAcrossAll] = await Promise.all([
    prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { words: true } } },
    }),
    // Authoritative "All" count — pulls straight from `Word` so it also
    // includes orphan rows where `batchId IS NULL` (legacy words from
    // before the import-batch feature; the schema explicitly allows this).
    // Summing per-batch `_count.words` would silently undercount those.
    prisma.word.count({ where: { userId } }),
  ]);
  // Category packs each get their own chip (named like "Greetings (N5)"
  // and stable across re-imports). Everything else is bucketed under a
  // single "Imported Words" chip — manual `Import #N` sessions plus any
  // orphan words (`batchId IS NULL`). We always render the Imported Words
  // chip when the rail is shown — even at zero — so the filter is
  // discoverable; clicking it when empty lands on the deck's "no words"
  // CTA which prompts the user to /import. Computing the count by
  // subtraction (totalAcrossAll - categoryTotal) avoids a third DB query
  // and matches the inclusive `where` clause exactly.
  const categoryBatches = batches.filter((b) => b.source === "category");
  const categoryTotal = categoryBatches.reduce(
    (s, b) => s + b._count.words,
    0,
  );
  const importedTotal = totalAcrossAll - categoryTotal;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/study"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Study
        </Link>
      </div>

      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Vocab cards</h1>
        <p className="text-muted-foreground">
          Tap the card to flip. Tap the speaker (or press P) to hear it.
          Viewing or flipping a card counts toward your daily{" "}
          {DAILY_CARD_GOAL}-card goal. The deck reshuffles every day and
          resumes at your first unviewed card.
        </p>
      </section>

      {totalAcrossAll > 0 && (
        <div className="flex flex-wrap gap-2">
          <BatchChip
            href="/study/vocab"
            label={`All (${totalAcrossAll})`}
            active={!batchId && !sourceFilter}
          />
          {categoryBatches.map((b) => (
            <BatchChip
              key={b.id}
              href={`/study/vocab?batch=${b.id}`}
              label={`${b.name} (${b._count.words})`}
              active={batchId === b.id}
            />
          ))}
          <BatchChip
            href="/study/vocab?source=import"
            label={`Imported Words (${importedTotal})`}
            active={sourceFilter === "import"}
          />
        </div>
      )}

      {/* `key` forces the deck to remount when the filter changes. The deck
          is a client component that snapshots `words` into local `useState`
          on mount, so without a key change a soft navigation (URL update +
          new server props) leaves the previous deck onscreen and the chips
          appear inert. The key also resets card index and the swipe state
          so a new filter starts cleanly at card 1. */}
      <StudyCardDeck
        key={filterKey}
        words={studyWords}
        initialViewedIds={initialViewedIds}
        dailyCardGoal={DAILY_CARD_GOAL}
        initialIndex={startIndex}
      />
    </div>
  );
}

function BatchChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted")
      }
    >
      {label}
    </Link>
  );
}
