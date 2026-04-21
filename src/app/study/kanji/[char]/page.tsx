import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { N5_KANJI, getKanjiByChar } from "@/lib/kanji";
import { KanjiCardDeck } from "@/components/kanji-card-deck";

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

  // Reorder the deck so the chosen character is first, then walk forward
  // through the rest. That way arrow keys keep advancing through N5.
  const start = N5_KANJI.findIndex((k) => k.char === decoded);
  const ordered = [
    ...N5_KANJI.slice(start),
    ...N5_KANJI.slice(0, Math.max(0, start)),
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/study/kanji"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All N5 kanji
        </Link>
      </div>

      <KanjiCardDeck kanji={ordered} />
    </div>
  );
}
