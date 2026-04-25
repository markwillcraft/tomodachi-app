import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProgressStatsForUser } from "@/lib/progress-stats";
import { ProgressView, type ProgressViewStats } from "./progress-view";

export const dynamic = "force-dynamic";

// Used to be a client component that mounted, showed a skeleton,
// then `useEffect → fetch /api/progress/stats`. That meant:
// - guaranteed extra round-trip
// - skeleton flash on every navigation
// - duplicated rate-limit budget vs. the Server Component path
// Reading via the lib function directly is faster, ships less JS,
// and keeps `/api/progress/stats` available for future callers.
export default async function ProgressPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const stats = await getProgressStatsForUser(userId);

  // RSC → Client serialization is robust for plain JSON shapes
  // but we explicitly stringify the Date columns so the client
  // type stays a plain `string`. No surprise `Date` proxies and
  // no "[object Object]" if the serializer ever changes.
  const viewStats: ProgressViewStats = {
    ...stats,
    attempts: stats.attempts.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return <ProgressView stats={viewStats} />;
}
