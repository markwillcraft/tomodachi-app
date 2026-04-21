import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brush,
  Flame,
  GraduationCap,
} from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { N5_LESSONS } from "@/lib/grammar";
import { N5_KANJI } from "@/lib/kanji";
import { getStreak } from "@/lib/streak";
import { getKanjiProgress } from "@/lib/kanji-progress";
import { StreakWidget } from "@/components/streak-widget";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudyHubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [wordCount, streak, kanjiProgress] = await Promise.all([
    prisma.word.count({ where: { userId } }),
    getStreak(userId),
    getKanjiProgress(userId),
  ]);

  const kanjiTodayCount = kanjiProgress.viewedToday.size;

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Study</h1>
        <p className="text-muted-foreground text-lg">
          Drill vocab cards with audio, then walk through N5 grammar in color.
        </p>
      </section>

      <StreakWidget {...streak} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/study/vocab" className="group block">
          <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="size-5" />
                <CardTitle>Vocab cards</CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {wordCount} words
                </Badge>
              </div>
              <CardDescription>
                Flip romaji → kana + meaning. Tap the speaker to hear a native
                female voice. Daily goal: view 50 cards.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              Open vocab <ArrowRight className="size-3.5" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/study/grammar" className="group block">
          <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="size-5" />
                <CardTitle>N5 grammar</CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {N5_LESSONS.length} lessons
                </Badge>
              </div>
              <CardDescription>
                Color-coded particles and copulas. Lesson 1-1: わたし は ローズ
                です — instantly readable.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              Open grammar <ArrowRight className="size-3.5" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/study/kanji" className="group block">
          <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brush className="size-5" />
                <CardTitle>N5 kanji</CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {kanjiTodayCount}/{N5_KANJI.length} today
                </Badge>
              </div>
              <CardDescription>
                Grouped into 10 themed sections with animated stroke order
                drawing and on'yomi/kun'yomi audio.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              Open kanji <ArrowRight className="size-3.5" />
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground flex items-start gap-3">
        <Flame className="size-4 mt-0.5 text-orange-400" />
        <div>
          <strong className="text-foreground">How the streak works:</strong> a
          day counts when you both (1) take quizzes totalling at least 50
          questions and (2) view at least 50 vocab cards in Study. Days reset
          at midnight UTC.
        </div>
      </section>
    </div>
  );
}
