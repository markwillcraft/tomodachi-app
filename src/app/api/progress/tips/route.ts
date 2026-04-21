import { NextResponse } from "next/server";
import { generateTips } from "@/lib/gemini";
import { getProgressSummary } from "@/lib/stats";
import { requireUserId } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const summary = await getProgressSummary(userId);
  if (summary.totalAnswered === 0) {
    return NextResponse.json({
      tips: ["Take your first quiz to unlock personalized tips."],
    });
  }
  const tips = await generateTips(summary);
  return NextResponse.json({ tips });
}
