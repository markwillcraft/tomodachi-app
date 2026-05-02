import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Languages } from "lucide-react";

import { requireUserId } from "@/lib/auth-utils";
import {
  dayOfCycleForLocalDate,
  localWeekdayLabel,
} from "@/lib/reading";
import { getUserTimezone } from "@/lib/time";
import { NextResponse } from "next/server";

import { KanaQuizSetup } from "./kana-quiz-setup";

// Server Component shell. Resolves the user's local timezone so the
// Reading Session picker can render the correct weekday label and
// today's auto-set on first paint (no hydration flash, no client
// Date dependency).
export default async function KanaQuizSetupPage() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) {
    redirect("/sign-in");
  }

  const tz = await getUserTimezone(userId);
  const now = new Date();
  const autoSet = dayOfCycleForLocalDate(now, tz);
  const weekdayLabel = localWeekdayLabel(now, tz);

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
          <Languages className="size-6" />
          <h1 className="text-3xl font-bold tracking-tight">
            Hiragana / Katakana quiz
          </h1>
        </div>
        <p className="text-muted-foreground">
          Pick the script and the rows you want to drill, or switch to a
          Reading Session for a passive flashcard run.
        </p>
      </section>

      <KanaQuizSetup weekdayLabel={weekdayLabel} autoSet={autoSet} />
    </div>
  );
}
