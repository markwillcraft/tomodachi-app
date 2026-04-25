import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ImportClient, type ImportWord } from "./import-client";

export const dynamic = "force-dynamic";

// Used to be a client component that mounted, then `useEffect →
// fetch /api/words` to populate the library table. Now the
// initial list comes from a Prisma read on the server, the form
// uses `apiFetch` for mutations, and `router.refresh()` re-runs
// this Server Component to pick up new/updated/deleted rows.
//
// Net result: one DB query instead of (render → fetch → re-render),
// no skeleton flash, no `read`-bucket charge for the page itself.
export default async function ImportPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const words = await prisma.word.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { batch: { select: { id: true, name: true, source: true } } },
  });

  // Strip Date columns (`createdAt`/`updatedAt`) before handing to
  // the client tree — none of them are read by the UI, and not
  // serializing them keeps the prop payload small and the boundary
  // type free of `Date` proxies.
  const viewWords: ImportWord[] = words.map((w) => ({
    id: w.id,
    romaji: w.romaji,
    hiragana: w.hiragana,
    katakana: w.katakana,
    english: w.english,
    batch: w.batch,
  }));

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Import romaji</h1>
        <p className="text-muted-foreground">
          One romaji per line, or comma-separated. Hiragana and katakana are
          auto-generated. English meaning is fetched via Google Gemini. Each
          import becomes its own batch (&quot;Import #1&quot;, &quot;Import
          #2&quot;) so you can study them separately later.
        </p>
      </section>

      <ImportClient initialWords={viewWords} />
    </div>
  );
}
