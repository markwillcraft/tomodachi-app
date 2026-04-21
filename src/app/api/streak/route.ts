import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { getStreak } from "@/lib/streak";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  const streak = await getStreak(userId);
  return NextResponse.json(streak);
}
