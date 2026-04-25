import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { markNotificationRead } from "@/lib/notify";

export const runtime = "nodejs";

// POST /api/notifications/:id/read
//
// Marks a single notification read. Idempotent — re-marking a
// already-read row is a no-op and still returns the current unread
// count. 404 if the row doesn't belong to the caller (404 not 403 to
// avoid leaking row existence to other users).
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = await enforceRateLimit("write", userId);
  if (limited) return limited;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = await markNotificationRead(userId, id);
  if (!result.ok) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, unreadCount: result.unreadCount });
}
