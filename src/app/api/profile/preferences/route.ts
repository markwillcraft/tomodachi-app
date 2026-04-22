import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import {
  getUserPreferences,
  isValidTimezone,
  setAutoFreezeStreak,
} from "@/lib/time";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  const prefs = await getUserPreferences(userId);
  return NextResponse.json(prefs);
}

// Patch any subset of user preferences. Currently only
// `autoFreezeStreak` is exposed here; timezone has its own dedicated
// endpoint because it gets set automatically from the browser on every
// page load.
export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { autoFreezeStreak, timezoneHint } = (body ?? {}) as {
    autoFreezeStreak?: unknown;
    timezoneHint?: unknown;
  };
  // The client forwards `Intl.DateTimeFormat().resolvedOptions().timeZone`
  // here so that if this PATCH ends up *creating* the UserProfile row
  // (because it doesn't exist yet), we seed it with the user's real
  // timezone instead of the column default `"UTC"`. If the row already
  // exists, the hint is ignored.
  const hint =
    typeof timezoneHint === "string" && isValidTimezone(timezoneHint)
      ? timezoneHint
      : undefined;

  if (autoFreezeStreak !== undefined) {
    if (typeof autoFreezeStreak !== "boolean") {
      return NextResponse.json(
        { error: "autoFreezeStreak must be a boolean" },
        { status: 400 },
      );
    }
    await setAutoFreezeStreak(userId, autoFreezeStreak, hint);
  }

  const prefs = await getUserPreferences(userId);
  return NextResponse.json({ ok: true, ...prefs });
}
