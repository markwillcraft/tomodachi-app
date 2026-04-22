-- CreateTable
CREATE TABLE "StreakFreeze" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "grantKey" TEXT NOT NULL,
    "consumedFor" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "StreakFreeze_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreakFreeze_userId_grantKey_key" ON "StreakFreeze"("userId", "grantKey");

-- CreateIndex
CREATE UNIQUE INDEX "StreakFreeze_userId_consumedFor_key" ON "StreakFreeze"("userId", "consumedFor");

-- CreateIndex
CREATE INDEX "StreakFreeze_userId_consumedFor_idx" ON "StreakFreeze"("userId", "consumedFor");
