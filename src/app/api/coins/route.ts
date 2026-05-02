import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { getCoinSummary, getDailyQuestsResult } from "@/lib/coins";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/coins
// Returns the user's total balance, today's earnings, the next reset
// timestamp, and the live progressive daily-quest list (with claim
// status, plus the resolved tier + focus). Used by the dashboard
// quest card and the sidebar coin chip.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  const [summary, questsResult] = await Promise.all([
    getCoinSummary(userId),
    getDailyQuestsResult(userId),
  ]);
  return NextResponse.json({
    ...summary,
    quests: questsResult.quests,
    tier: questsResult.tier,
    focus: questsResult.focus,
    tierSource: questsResult.source,
  });
}
