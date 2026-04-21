import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StudyCardDeck, type StudyWord } from "@/components/study-card";
import { DAILY_CARD_GOAL } from "@/lib/streak";

export const dynamic = "force-dynamic";

export default async function StudyVocabPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const sp = await searchParams;
  const batchId = sp.batch ? Number(sp.batch) : null;

  const words = await prisma.word.findMany({
    where: {
      userId,
      ...(batchId && Number.isFinite(batchId) ? { batchId } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { batch: { select: { id: true, name: true } } },
  });

  // Build today's already-viewed set so the StudyCardDeck reflects current
  // streak progress on first load. Day boundary uses UTC to match streak
  // logic.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const todayViews = await prisma.cardView.findMany({
    where: { userId, createdAt: { gte: startOfDay } },
    select: { wordId: true },
  });
  const initialViewedIds = Array.from(
    new Set(todayViews.map((v) => v.wordId)),
  );

  const studyWords: StudyWord[] = words.map((w) => ({
    id: w.id,
    romaji: w.romaji,
    hiragana: w.hiragana,
    katakana: w.katakana,
    english: w.english,
    batchName: w.batch?.name ?? null,
  }));

  // Show the list of batches as quick filters at the top.
  const batches = await prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { words: true } } },
  });
  const totalAcrossAll = batches.reduce((s, b) => s + b._count.words, 0);

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
          {DAILY_CARD_GOAL}-card goal.
        </p>
      </section>

      {batches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <BatchChip
            href="/study/vocab"
            label={`All (${totalAcrossAll})`}
            active={!batchId}
          />
          {batches.map((b) => (
            <BatchChip
              key={b.id}
              href={`/study/vocab?batch=${b.id}`}
              label={`${b.name} (${b._count.words})`}
              active={batchId === b.id}
            />
          ))}
        </div>
      )}

      <StudyCardDeck
        words={studyWords}
        initialViewedIds={initialViewedIds}
        dailyCardGoal={DAILY_CARD_GOAL}
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
