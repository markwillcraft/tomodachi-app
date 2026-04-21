import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import {
  N5_LESSONS,
  TOKEN_COLOR_CLASS,
  getLessonBySlug,
  type Token,
} from "@/lib/grammar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GrammarExampleLine } from "@/components/grammar-example-line";

export const dynamic = "force-dynamic";

export default async function GrammarLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) notFound();

  const idx = N5_LESSONS.findIndex((l) => l.slug === slug);
  const prev = idx > 0 ? N5_LESSONS[idx - 1] : null;
  const next = idx + 1 < N5_LESSONS.length ? N5_LESSONS[idx + 1] : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/study/grammar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All lessons
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">N5</Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Lesson {lesson.number}
          </h1>
        </div>
        <p className="text-muted-foreground">{lesson.meaning}</p>
      </section>

      <Chalkboard lesson={lesson} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {lesson.explanation}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Examples</h2>
        <p className="text-xs text-muted-foreground">
          Tap any word to hear it · tap the speaker to play the whole sentence.
        </p>
        <div className="space-y-3">
          {lesson.examples.map((ex, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardDescription>{i + 1}.</CardDescription>
                <CardTitle className="text-lg sm:text-xl">
                  {ex.english}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrammarExampleLine tokens={ex.jp} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <nav className="flex items-center justify-between pt-4">
        {prev ? (
          <Link
            href={`/study/grammar/${prev.slug}`}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/40"
          >
            <ArrowLeft className="size-4" />
            <span>
              <span className="text-muted-foreground">Lesson {prev.number}</span>
              <br />
              <span className="text-xs">{prev.meaning}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/study/grammar/${next.slug}`}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/40 text-right"
          >
            <span>
              <span className="text-muted-foreground">Lesson {next.number}</span>
              <br />
              <span className="text-xs">{next.meaning}</span>
            </span>
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

function Chalkboard({ lesson }: { lesson: (typeof N5_LESSONS)[number] }) {
  return (
    <div className="rounded-2xl border-4 border-amber-700/40 bg-[#0e1410] shadow-inner">
      <div className="rounded-t-xl bg-black/40 px-6 py-3 text-sm font-semibold tracking-wider text-amber-100">
        Lesson {lesson.number}
      </div>
      <div className="p-6 sm:p-10">
        <div className="jp text-3xl sm:text-5xl leading-relaxed text-center">
          <RubyLine tokens={lesson.pattern} center bigRomaji />
        </div>
        <p className="mt-6 text-center text-sm text-rose-300">
          ({lesson.meaning})
        </p>
      </div>
    </div>
  );
}

function RubyLine({
  tokens,
  center = false,
  bigRomaji = false,
}: {
  tokens: Token[];
  center?: boolean;
  bigRomaji?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex flex-wrap items-end gap-x-1 gap-y-2 " +
        (center ? "justify-center" : "")
      }
    >
      {tokens.map((t, i) => (
        <span
          key={i}
          className="inline-flex flex-col items-center leading-tight"
        >
          {t.romaji && (
            <span
              className={
                "block text-muted-foreground " +
                (bigRomaji ? "text-xs sm:text-sm" : "text-[10px]")
              }
            >
              {t.romaji}
            </span>
          )}
          <span className={"jp " + TOKEN_COLOR_CLASS[t.color]}>{t.text}</span>
        </span>
      ))}
    </span>
  );
}
