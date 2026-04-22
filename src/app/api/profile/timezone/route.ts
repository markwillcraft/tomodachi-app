import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { isValidTimezone, setUserTimezone } from "@/lib/time";

export const runtime = "nodejs";

// The client posts `Intl.DateTimeFormat().resolvedOptions().timeZone` on
// first load (and any time it changes). We validate that it's a real IANA
// zone before persisting so a malicious payload can't break our day-math.
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { timezone } = (body ?? {}) as { timezone?: unknown };
  if (typeof timezone !== "string" || !isValidTimezone(timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  await setUserTimezone(userId, timezone);
  return NextResponse.json({ ok: true, timezone });
}
