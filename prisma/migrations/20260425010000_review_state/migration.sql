-- CreateTable
CREATE TABLE "ReviewState" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalSeen" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_userId_itemType_itemKey_key" ON "ReviewState"("userId", "itemType", "itemKey");

-- CreateIndex
CREATE INDEX "ReviewState_userId_nextReviewAt_idx" ON "ReviewState"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "ReviewState_userId_itemType_level_idx" ON "ReviewState"("userId", "itemType", "level");
