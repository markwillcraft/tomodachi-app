import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import { VocabQuizForm } from "./vocab-quiz-form";

export const dynamic = "force-dynamic";

export default async function VocabQuizSetupPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // The setup screen used to mount, then `useEffect` → fetch
  // /api/words just to count them. That meant a guaranteed
  // round-trip + skeleton flash. Counting on the server makes
  // the render synchronous from the user's POV.
  const [wordCount, categoryBatches] = await Promise.all([
    prisma.word.count({ where: { userId } }),
    prisma.importBatch.findMany({
      where: { userId, source: "category" },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { words: true } } },
    }),
  ]);
  const categoryTotal = categoryBatches.reduce((sum, b) => sum + b._count.words, 0);
  const importedCount = Math.max(0, wordCount - categoryTotal);
  const existingCategoryBatchNames = new Set(categoryBatches.map((b) => b.name));
  const catalogTopics = CATEGORIES.map((cat) => {
    const batchName = `${cat.name} (${cat.level})`;
    return {
      slug: cat.slug,
      name: cat.name,
      level: cat.level,
      count: cat.words.length,
      batchName,
      alreadyAdded: existingCategoryBatchNames.has(batchName),
    };
  });
  const formBatches = categoryBatches.map((b) => ({
    id: b.id,
    name: b.name,
    count: b._count.words,
  }));

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
          <BookOpen className="size-6" />
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary quiz</h1>
        </div>
        <p className="text-muted-foreground">
          Mixed kana ↔ romaji ↔ English questions, weighted toward words
          you&apos;ve gotten wrong before.
        </p>
      </section>

      <VocabQuizForm
        wordCount={wordCount}
        importedCount={importedCount}
        categoryBatches={formBatches}
        catalogTopics={catalogTopics}
      />
    </div>
  );
}
