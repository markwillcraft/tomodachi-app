import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import {
  N5_KANJI,
  getKanjiByChar,
  getKanjiInSection,
  getSectionByKanji,
} from "@/lib/kanji";
import { KanjiCardDeck } from "@/components/kanji-card-deck";
import { getKanjiProgress } from "@/lib/kanji-progress";

export const dynamic = "force-dynamic";

export default async function KanjiDetailPage({
  params,
}: {
  params: Promise<{ char: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { char } = await params;
  const decoded = decodeURIComponent(char);
  const kanji = getKanjiByChar(decoded);
  if (!kanji) notFound();

  // Prefer walking the deck within the same themed section (keeps the
  // learner inside one "chapter" when they press Next) and fall back to
  // the full N5 list when the character isn't in a known section.
  const section = getSectionByKanji(decoded);
  const pool = section ? getKanjiInSection(section) : N5_KANJI;
  const start = pool.findIndex((k) => k.char === decoded);
  const ordered = [
    ...pool.slice(Math.max(0, start)),
    ...pool.slice(0, Math.max(0, start)),
  ];

  const { viewedToday } = await getKanjiProgress(userId);
  const viewedChars = Array.from(viewedToday);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/study/kanji"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All N5 kanji
        </Link>
        {section && (
          <span className="text-xs text-muted-foreground">
            Studying{" "}
            <span className="font-medium text-foreground">{section.title}</span>
          </span>
        )}
      </div>

      <KanjiCardDeck
        kanji={ordered}
        initialViewedChars={viewedChars}
      />
    </div>
  );
}
