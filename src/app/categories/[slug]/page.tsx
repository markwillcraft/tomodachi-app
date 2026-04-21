import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCategoryBySlug } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { CategoryWordsTable } from "@/components/category-words-table";

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const owned = await prisma.word.findMany({
    where: {
      userId,
      romaji: { in: category.words.map((w) => w.romaji) },
    },
    select: { romaji: true },
  });
  const ownedSet = new Set(owned.map((w) => w.romaji.toLowerCase()));

  const ownedRomaji = category.words
    .filter((w) => ownedSet.has(w.romaji.toLowerCase()))
    .map((w) => w.romaji);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/categories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All categories
        </Link>
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
          <Badge variant="outline">{category.level}</Badge>
        </div>
        <p className="text-muted-foreground">{category.description}</p>
        <p className="text-sm text-muted-foreground">
          {category.words.length} words · {ownedRomaji.length} already in your
          vocab
        </p>
      </section>

      <CategoryWordsTable
        slug={category.slug}
        words={category.words}
        initialOwnedRomaji={ownedRomaji}
      />
    </div>
  );
}
