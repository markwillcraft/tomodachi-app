import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Returns the authenticated Clerk user's id, or sends a 401 JSON response.
 * Usage:
 *   const userId = await requireUserId();
 *   if (userId instanceof NextResponse) return userId;
 */
export async function requireUserId(): Promise<string | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}
