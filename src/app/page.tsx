import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock, Layers, Sparkles } from "lucide-react";
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
        <h1 className="text-5xl font-bold tracking-tight">
          Build your own <span className="jp">日本語</span> quiz.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Sign in, drop a list of romaji, and get personalized multiple-choice
          quizzes with hiragana, katakana, and English meanings auto-filled by
          Gemini. Track accuracy, time-per-question, and weak spots over time.
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

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Feature
          icon={<BookOpen className="size-5" />}
          title="Your own vocab"
          desc="Import romaji manually, by .txt upload, or pick from JLPT N5 categories."
        />
        <Feature
          icon={<Layers className="size-5" />}
          title="N5 categories"
          desc="Browse curated lists like Greetings, Numbers, Family, Verbs and add to vocab."
        />
        <Feature
          icon={<Clock className="size-5" />}
          title="Per-question timing"
          desc="See exactly which words slow you down so you can drill them harder."
        />
        <Feature
          icon={<Sparkles className="size-5" />}
          title="AI study coach"
          desc="Gemini reads your stats and suggests the next thing to practice."
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
