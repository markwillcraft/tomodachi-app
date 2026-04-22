import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-utils";
import { awardForKanaDrill } from "@/lib/coins";

export const runtime = "nodejs";

// POST /api/study/kana-drill  { drillKey, total, correct }
//
// Records the result of a completed kana muscle-memory session and
// returns the coin payout. The drillKey is a client-generated unique id
// (e.g. crypto.randomUUID()) used to dedup network retries — same key
// will not double-pay.
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { drillKey, total, correct } = (body ?? {}) as {
    drillKey?: string;
    total?: number;
    correct?: number;
  };

  if (!drillKey || typeof drillKey !== "string") {
    return NextResponse.json({ error: "Missing drillKey" }, { status: 400 });
  }
  if (typeof total !== "number" || total <= 0) {
    return NextResponse.json({ error: "Invalid total" }, { status: 400 });
  }
  if (typeof correct !== "number" || correct < 0 || correct > total) {
    return NextResponse.json({ error: "Invalid correct count" }, { status: 400 });
  }

  const coins = await awardForKanaDrill(
    userId,
    drillKey.slice(0, 64),
    total,
    correct,
  );
  return NextResponse.json({ ok: true, coins });
}
