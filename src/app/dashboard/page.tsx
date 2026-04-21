import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers,
  Sparkles,
} from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getStreak } from "@/lib/streak";
import { StreakWidget } from "@/components/streak-widget";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  const [wordCount, recentAttempts, streak] = await Promise.all([
    prisma.word.count({ where: { userId } }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getStreak(userId),
  ]);
  const totalAnswered = recentAttempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = recentAttempts.reduce((s, a) => s + a.correct, 0);
  const recentAccuracy =
    totalAnswered === 0 ? null : Math.round((totalCorrect / totalAnswered) * 100);

  const firstName =
    user?.firstName ??
    user?.username ??
    user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
    "there";

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Hi {firstName}, ready to study?
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Your library, your pace. Build it from N5 categories or your own
          imports.
        </p>
      </section>

      <StreakWidget {...streak} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Words in your library" value={wordCount.toString()} />
        <StatCard
          label="Recent accuracy (last 10 quizzes)"
          value={recentAccuracy === null ? "—" : `${recentAccuracy}%`}
        />
        <StatCard
          label="Quizzes taken"
          value={(recentAttempts.length === 10
            ? "10+"
            : recentAttempts.length
          ).toString()}
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          href="/study"
          title="Study"
          desc="Vocab cards with audio + N5 grammar lessons in color."
          icon={<BookOpen className="size-5" />}
        />
        <ActionCard
          href="/categories"
          title="N5 Categories"
          desc="Browse curated word lists by topic and add them to your vocab."
          icon={<Layers className="size-5" />}
        />
        <ActionCard
          href="/quiz"
          title="Start a quiz"
          desc="Vocabulary, hiragana, katakana, or mixed."
          icon={<GraduationCap className="size-5" />}
        />
        <ActionCard
          href="/progress"
          title="View progress"
          desc="Accuracy over time, weakest words, slowest words, AI tips."
          icon={<Sparkles className="size-5" />}
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground">
            Open
            <ArrowRight className="size-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
