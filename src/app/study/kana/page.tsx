import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Languages } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { KanaTable } from "@/components/kana-table";

export const dynamic = "force-dynamic";

export default async function KanaTablePage() {
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
        <div className="flex flex-wrap items-center gap-2">
          <Languages className="size-6" />
          <h1 className="text-3xl font-bold tracking-tight">Kana table</h1>
          <Badge variant="outline">Reference</Badge>
        </div>
        <p className="text-muted-foreground">
          The full hiragana and katakana charts in the textbook gojūon
          layout. Toggle between scripts, hide romaji to self-test, and tap
          any cell to hear it pronounced by a native voice.
        </p>
      </section>

      <KanaTable />
    </div>
  );
}
