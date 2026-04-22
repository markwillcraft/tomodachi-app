import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { getCoinSummary, getDailyQuests } from "@/lib/coins";

export const runtime = "nodejs";

// GET /api/coins
// Returns the user's total balance, today's earnings, the next reset
// timestamp, and the live daily quest list (with claim status). Used by
// the dashboard quest card and the sidebar coin chip.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  const [summary, quests] = await Promise.all([
    getCoinSummary(userId),
    getDailyQuests(userId),
  ]);
  return NextResponse.json({ ...summary, quests });
}
