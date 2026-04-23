-- CreateTable
CREATE TABLE "KanaView" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "kana" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanaView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanaView_userId_createdAt_idx" ON "KanaView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KanaView_userId_kana_idx" ON "KanaView"("userId", "kana");
