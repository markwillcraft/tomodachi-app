import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { applyFreezeToDay } from "@/lib/streak-freeze";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const REASON_HTTP_STATUS: Record<string, number> = {
  no_freezes: 409,
  out_of_range: 400,
  future_day: 400,
  today_locked: 400,
  already_complete: 409,
  already_frozen: 409,
};

const REASON_MESSAGES: Record<string, string> = {
  no_freezes: "You don't have any freeze credits to spend.",
  out_of_range: "That day is too far back to save with a freeze.",
  future_day: "You can't freeze a day in the future.",
  today_locked: "You can still complete today — no need to freeze it.",
  already_complete: "That day already hit the daily goal.",
  already_frozen: "That day is already covered by a freeze.",
};

// Manual freeze application. Body: { day: "YYYY-MM-DD" } in the user's
// local timezone. Validates the day is in-range, missed, unfrozen, and
// the user has inventory before consuming. Used when the
// `autoFreezeStreak` preference is off (or just whenever the user
// wants to retroactively save a day).
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  // Inventory-spending action — `sensitive` bucket so a script can't
  // burn freezes faster than a human ever could.
  const limited = await enforceRateLimit("sensitive", userId);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { day } = (body ?? {}) as { day?: unknown };
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "Invalid day key" }, { status: 400 });
  }

  const result = await applyFreezeToDay(userId, day);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: REASON_MESSAGES[result.reason] ?? "Could not apply freeze",
        reason: result.reason,
      },
      { status: REASON_HTTP_STATUS[result.reason] ?? 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    day: result.dayKey,
    remaining: result.remaining,
  });
}
