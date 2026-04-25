// AI study tips: no in-app UI for now. When re-enabled, surface it in a
// single place only — see `.cursor/docs/roadmap/09-tiers-and-trial.md`
// ("AI Study Tips — placement").
import { NextResponse } from "next/server";
import { generateTips } from "@/lib/gemini";
import { getProgressSummary } from "@/lib/stats";
import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // Strict per-user rate limit on the LLM endpoint — protects the
  // Gemini bill from runaway clients/scripts. Real users click this
  // a few times per day; 5/min covers retries without enabling abuse.
  const limited = await enforceRateLimit("ai", userId);
  if (limited) return limited;

  const summary = await getProgressSummary(userId);
  if (summary.totalAnswered === 0) {
    return NextResponse.json({
      tips: ["Take your first quiz to unlock personalized tips."],
    });
  }
  const tips = await generateTips(summary);
  return NextResponse.json({ tips });
}
