import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Layers } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCategoriesByLevel } from "@/lib/categories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const categories = getCategoriesByLevel("N5");

  // Fetch the user's existing romaji set so we can show how many words
  // they've already added per category.
  const owned = await prisma.word.findMany({
    where: { userId },
    select: { romaji: true },
  });
  const ownedSet = new Set(owned.map((w) => w.romaji.toLowerCase()));

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="size-5" />
          <h1 className="text-3xl font-bold tracking-tight">JLPT N5 Categories</h1>
        </div>
        <p className="text-muted-foreground">
          Browse curated N5 vocabulary by topic. Pick what you want to learn,
          then add words to your personal vocab. (N4, N3 coming soon.)
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => {
          const total = c.words.length;
          const added = c.words.filter((w) =>
            ownedSet.has(w.romaji.toLowerCase()),
          ).length;
          return (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="block group"
            >
              <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {c.level}
                    </Badge>
                  </div>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {added}/{total} added
                  </span>
                  <span className="flex items-center gap-1 group-hover:text-foreground">
                    Browse <ArrowRight className="size-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
