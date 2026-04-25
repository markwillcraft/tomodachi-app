import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { getStreak } from "@/lib/streak";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  const streak = await getStreak(userId);
  return NextResponse.json(streak);
}
