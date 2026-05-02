import Link from "next/link";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ArrowLeft } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-utils";
import {
  getReadingStageMeta,
  isReadingSet,
  isReadingStage,
  ReadingDeckError,
  type ReadingSet,
  type ReadingStage,
} from "@/lib/reading";
import { getReadingWordsForStageAndSet } from "@/lib/reading-server";
import { getUserTimezone } from "@/lib/time";

import { ReadingRunner } from "./reading-runner";

// Server Component shell for the Reading mode play screen. Validates
// the `?stage` (1..4) and optional `?set` (1..5) search params,
// resolves the user's local weekday into today's auto-set on
// weekdays, and hands the resolved 50-word deck to the client runner.
//
// We fetch directly via `getReadingWordsForStageAndSet()` (instead of
// the API route) to avoid an internal HTTP round-trip on first paint.
// The API exists for future surfaces — admin tooling, dashboard
// "preview today's set" peeks, third-party integrations.
export default async function ReadingPlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const stageRaw = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const setRaw = Array.isArray(params.set) ? params.set[0] : params.set;

  const stageNum = Number(stageRaw);
  if (!isReadingStage(stageNum)) {
    return (
      <ReadingPlayError
        title="Invalid stage"
        body="The stage param must be 1, 2, 3, or 4."
      />
    );
  }
  const stage = stageNum as ReadingStage;

  let set: ReadingSet | undefined;
  if (setRaw !== undefined && setRaw !== "") {
    const setNum = Number(setRaw);
    if (!isReadingSet(setNum)) {
      return (
        <ReadingPlayError
          title="Invalid set"
          body="The set param must be 1, 2, 3, 4, or 5."
        />
      );
    }
    set = setNum;
  }

  const tz = await getUserTimezone(userId);

  let deck: Awaited<ReturnType<typeof getReadingWordsForStageAndSet>>;
  try {
    deck = await getReadingWordsForStageAndSet({
      stage,
      set,
      now: new Date(),
      tz,
    });
  } catch (err) {
    if (err instanceof ReadingDeckError) {
      return (
        <ReadingPlayError
          title={
            err.code === "set_required_on_weekend"
              ? "Pick a set first"
              : "Couldn't load deck"
          }
          body={
            err.code === "set_required_on_weekend"
              ? "On Saturday and Sunday you choose which set (1–5) to replay. Head back and tap one before starting."
              : err.message
          }
        />
      );
    }
    throw err;
  }

  if (deck.words.length < 50) {
    return (
      <ReadingPlayError
        title="This set isn't ready yet"
        body={`Only ${deck.words.length} of 50 words are seeded for ${getReadingStageMeta(stage).label} · Set ${deck.set}. Run \`npx prisma db seed\` against this database, or come back after the bank is filled in.`}
      />
    );
  }

  return (
    <ReadingRunner
      stage={stage}
      set={deck.set}
      isAutoSet={deck.isAutoSet}
      weekdayLabel={deck.weekdayLabel}
      words={deck.words}
    />
  );
}

function ReadingPlayError({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/quiz/kana"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to setup
      </Link>
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{body}</AlertDescription>
      </Alert>
      <div>
        <Button asChild variant="outline">
          <Link href="/quiz/kana">Pick a stage</Link>
        </Button>
      </div>
    </div>
  );
}
