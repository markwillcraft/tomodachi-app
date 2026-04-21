-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- AlterTable
ALTER TABLE "Word" ADD COLUMN "batchId" INTEGER;

-- CreateIndex
CREATE INDEX "Word_batchId_idx" ON "Word"("batchId");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CardView" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardView_userId_createdAt_idx" ON "CardView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CardView_wordId_idx" ON "CardView"("wordId");

-- AddForeignKey
ALTER TABLE "CardView" ADD CONSTRAINT "CardView_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
