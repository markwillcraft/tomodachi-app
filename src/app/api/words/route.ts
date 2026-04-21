import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const words = await prisma.word.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { batch: { select: { id: true, name: true, source: true } } },
  });
  return NextResponse.json({ words });
}
