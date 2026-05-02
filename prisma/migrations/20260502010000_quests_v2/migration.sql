-- CreateTable
CREATE TABLE "ReadingSession" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "set" INTEGER NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "cardsShown" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingSession_sessionKey_key" ON "ReadingSession"("sessionKey");

-- CreateIndex
CREATE INDEX "ReadingSession_userId_completedAt_idx" ON "ReadingSession"("userId", "completedAt");

-- CreateTable
CREATE TABLE "KanaDrillSession" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "drillKey" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanaDrillSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KanaDrillSession_drillKey_key" ON "KanaDrillSession"("drillKey");

-- CreateIndex
CREATE INDEX "KanaDrillSession_userId_completedAt_idx" ON "KanaDrillSession"("userId", "completedAt");

-- CreateTable
CREATE TABLE "UserQuestTier" (
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestTier_pkey" PRIMARY KEY ("userId")
);
