import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  Layers,
  Sparkles,
  Volume2,
} from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-16">
      <section className="space-y-5 pt-8">
        <Image
          src="/tomodachi-logo.svg"
          alt="Tomodachi"
          width={201}
          height={112}
          priority
          draggable={false}
          className="h-24 w-auto select-none drop-shadow-sm sm:h-28"
        />
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Tomodachi · your Japanese study buddy
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Make friends with <span className="jp">日本語</span>.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Tomodachi (友だち, "friend") gives you flip-card vocab with native
          pronunciation, color-coded N5 grammar, AI-powered quizzes, and a
          daily streak that keeps you honest. Free, dark-mode-friendly, and
          built around how you actually learn.
        </p>
        <div className="flex gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/sign-up">Get started — free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Feature
          icon={<Volume2 className="size-5" />}
          title="Listen & flip"
          desc="Tap a card to flip romaji → kana + meaning. Tap the speaker to hear native Japanese pronunciation."
        />
        <Feature
          icon={<Sparkles className="size-5" />}
          title="N5 grammar, in color"
          desc="Color-coded particles and copulas make Lesson 1-1 (N1 は N2 です) instantly readable."
        />
        <Feature
          icon={<Flame className="size-5" />}
          title="Daily streak"
          desc="A day counts when you take a 50-question quiz AND view 50 cards. Real practice, not vanity."
        />
        <Feature
          icon={<Layers className="size-5" />}
          title="Categorized vocab"
          desc="Every import becomes its own batch — Import #1, Import #2 — so you can study what you added when."
        />
        <Feature
          icon={<BookOpen className="size-5" />}
          title="N5 starter packs"
          desc="Greetings, numbers, family, verbs and more. Add a category to vocab in one click."
        />
        <Feature
          icon={<Clock className="size-5" />}
          title="AI study coach"
          desc="Gemini reads your stats and tells you which words are slowing you down."
        />
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
        Learn more <ArrowRight className="size-3.5" />
      </CardContent>
    </Card>
  );
}
