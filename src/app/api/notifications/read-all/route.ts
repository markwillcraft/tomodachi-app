import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { markAllNotificationsRead } from "@/lib/notify";

export const runtime = "nodejs";

// POST /api/notifications/read-all
//
// Marks every unread notification for the user as read in a single
// updateMany. Returns the number of rows that flipped — useful for
// the toast ("Marked 7 as read").
export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("write", userId);
  if (limited) return limited;

  const { updated } = await markAllNotificationsRead(userId);
  return NextResponse.json({ ok: true, updated });
}
