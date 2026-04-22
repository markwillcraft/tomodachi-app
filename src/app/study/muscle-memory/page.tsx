import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Keyboard, Sparkles } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { KanaMuscleMemory } from "@/components/kana-muscle-memory";

export const dynamic = "force-dynamic";

export default async function MuscleMemoryPage() {
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

      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/15 via-background to-background p-6 sm:p-8">
        <div
          aria-hidden
          className="jp pointer-events-none absolute -right-6 -top-8 select-none text-[10rem] font-bold leading-none text-emerald-500/10 sm:text-[14rem]"
        >
          打
        </div>
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            Study · drill
          </div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
            <Keyboard className="size-7" />
            Muscle memory
          </h1>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            A kana flies in from the right — type the romaji as fast as you
            can. The board scrolls to the next character on each correct
            answer. Great for burning the kana into your fingers.
          </p>
        </div>
      </section>

      <KanaMuscleMemory />
    </div>
  );
}
