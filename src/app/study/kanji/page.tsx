import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { N5_KANJI } from "@/lib/kanji";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function KanjiIndexPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

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
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">N5 Kanji</h1>
          <Badge variant="outline">{N5_KANJI.length} characters</Badge>
        </div>
        <p className="text-muted-foreground">
          Tap any character to study it: meaning, on'yomi/kun'yomi readings
          with audio, and animated stroke order.
        </p>
      </section>

      <div className="rounded-2xl border-4 border-amber-700/40 bg-amber-400 p-3 sm:p-5 shadow-inner">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-2">
          {N5_KANJI.map((k) => (
            <Link
              key={k.char}
              href={`/study/kanji/${encodeURIComponent(k.char)}`}
              className="group relative flex aspect-square flex-col items-center justify-center rounded-md border-2 border-amber-700/30 bg-amber-50 text-zinc-900 transition-transform hover:scale-105 hover:border-amber-700"
              title={`${k.char} — ${k.meaning}`}
            >
              <span className="jp text-2xl font-bold sm:text-3xl">
                {k.char}
              </span>
              <span className="mt-0.5 text-[9px] uppercase tracking-wide text-zinc-700 sm:text-[10px]">
                {k.meaning.split(",")[0]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Stroke-order data courtesy of the{" "}
        <a
          href="https://kanjivg.tagaini.net/"
          target="_blank"
          rel="noreferrer noopener"
          className="underline hover:text-foreground"
        >
          KanjiVG
        </a>{" "}
        project (CC BY-SA 3.0).
      </p>
    </div>
  );
}
