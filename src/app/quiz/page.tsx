import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brush,
  GraduationCap,
  Languages,
  Sparkles,
} from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { N5_KANJI } from "@/lib/kanji";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function QuizHubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const wordCount = await prisma.word.count({ where: { userId } });

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Quiz</h1>
        <p className="text-muted-foreground text-lg">
          Pick what you want to drill. Every quiz answer counts toward your
          daily streak goal of 50 questions.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModeCard
          href="/quiz/vocab"
          title="Vocabulary"
          desc="Quiz your imported words. Romaji ↔ kana ↔ English."
          badge={`${wordCount} words`}
          icon={<BookOpen className="size-5" />}
          accent="from-rose-500/20 to-amber-400/10"
        />
        <ModeCard
          href="/quiz/kana"
          title="Hiragana / Katakana"
          desc="Pick the script (one or both) and choose which rows: a-row, ka-row, etc."
          badge="46+ chars"
          icon={<Languages className="size-5" />}
          accent="from-cyan-400/20 to-blue-500/10"
        />
        <ModeCard
          href="/quiz/kanji"
          title="N5 Kanji"
          desc="The full N5 kanji set. Recognize the meaning, the character, or the reading."
          badge={`${N5_KANJI.length} chars`}
          icon={<Brush className="size-5" />}
          accent="from-amber-400/20 to-emerald-400/10"
        />
      </section>

      <section className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground flex items-start gap-3">
        <Sparkles className="size-4 mt-0.5 text-violet-400" />
        <div>
          <strong className="text-foreground">Tip:</strong> the AI study coach
          on the{" "}
          <Link href="/progress" className="underline">
            Progress page
          </Link>{" "}
          looks at your weakest words across all quiz types and tells you what
          to drill next.
        </div>
      </section>
    </div>
  );
}

function ModeCard({
  href,
  title,
  desc,
  badge,
  icon,
  accent,
}: {
  href: string;
  title: string;
  desc: string;
  badge: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={
          "h-full transition-colors group-hover:border-primary/50 bg-gradient-to-br " +
          accent
        }
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {badge}
            </Badge>
          </div>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
          <GraduationCap className="size-3.5" />
          Start <ArrowRight className="size-3.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
