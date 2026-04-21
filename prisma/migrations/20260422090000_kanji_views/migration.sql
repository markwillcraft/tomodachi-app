-- CreateTable
CREATE TABLE "KanjiView" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "char" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanjiView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanjiView_userId_createdAt_idx" ON "KanjiView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KanjiView_userId_char_idx" ON "KanjiView"("userId", "char");
