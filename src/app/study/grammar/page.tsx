import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { N5_LESSONS, TOKEN_COLOR_CLASS, type Token } from "@/lib/grammar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function GrammarIndexPage() {
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
          <GraduationCap className="size-5" />
          <h1 className="text-3xl font-bold tracking-tight">N5 Grammar</h1>
          <Badge variant="outline">{N5_LESSONS.length} lessons</Badge>
        </div>
        <p className="text-muted-foreground">
          Each lesson highlights particles, nouns, and copulas in distinct
          colors so the structure jumps out at you. Start with 1-1 and work
          your way down.
        </p>
        <Legend />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {N5_LESSONS.map((l) => (
          <Link
            key={l.slug}
            href={`/study/grammar/${l.slug}`}
            className="group block"
          >
            <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Lesson {l.number}
                  </CardTitle>
                  <Badge variant="outline">N5</Badge>
                </div>
                <div className="jp text-2xl mt-2">
                  <PatternRow tokens={l.pattern} />
                </div>
                <CardDescription className="mt-2">
                  {l.meaning}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
                Open lesson <ArrowRight className="size-3.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PatternRow({ tokens }: { tokens: Token[] }) {
  return (
    <span>
      {tokens.map((t, i) => (
        <span key={i} className={TOKEN_COLOR_CLASS[t.color]}>
          {t.text}
        </span>
      ))}
    </span>
  );
}

function Legend() {
  const items: Array<{ label: string; color: keyof typeof TOKEN_COLOR_CLASS }> = [
    { label: "Noun 1", color: "noun1" },
    { label: "Noun 2", color: "noun2" },
    { label: "Particle", color: "particle" },
    { label: "Copula", color: "copula" },
    { label: "Verb", color: "verb" },
    { label: "Question", color: "question" },
  ];
  return (
    <div className="flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className={
              "size-2.5 rounded-full bg-current " + TOKEN_COLOR_CLASS[i.color]
            }
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
