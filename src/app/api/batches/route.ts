import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-utils";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const batches = await prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { words: true } } },
  });

  return NextResponse.json({
    batches: batches.map((b) => ({
      id: b.id,
      name: b.name,
      source: b.source,
      createdAt: b.createdAt,
      wordCount: b._count.words,
    })),
  });
}
