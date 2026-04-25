import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getProgressStatsForUser } from "@/lib/progress-stats";

export const runtime = "nodejs";

// Kept as an API surface even though `/progress` now reads the
// stats directly via `getProgressStatsForUser`. Useful for any
// future client-side refresh, embedding, or third-party tooling.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // Heavy fan-out (6 parallel queries + an attempt scan). The `read`
  // bucket caps a script trying to scrape per-user analytics.
  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  const stats = await getProgressStatsForUser(userId);
  return NextResponse.json(stats);
}
