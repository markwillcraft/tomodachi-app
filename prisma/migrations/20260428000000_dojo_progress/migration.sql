-- CreateTable
CREATE TABLE "DojoProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "bestScorePct" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "passedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DojoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DojoProgress_userId_lessonId_section_key" ON "DojoProgress"("userId", "lessonId", "section");

-- CreateIndex
CREATE INDEX "DojoProgress_userId_lessonId_idx" ON "DojoProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "DojoProgress_userId_passedAt_idx" ON "DojoProgress"("userId", "passedAt");
