import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getNotifications } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/notifications?limit=10
//
// Returns the user's most recent notifications + the total unread
// count. Polled by the topbar bell (every ~60s) and read once by the
// /notifications page on render. Uses the generous `read` rate-limit
// bucket since a real user can hammer this just by tabbing back to
// the app.
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("read", userId);
  if (limited) return limited;

  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit ? Math.max(1, Math.min(50, Number(rawLimit) || 10)) : 10;

  const data = await getNotifications(userId, limit);
  return NextResponse.json(data);
}
