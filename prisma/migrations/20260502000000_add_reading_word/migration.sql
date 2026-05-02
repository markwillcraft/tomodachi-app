-- CreateTable
CREATE TABLE "ReadingWord" (
    "id" SERIAL NOT NULL,
    "stage" INTEGER NOT NULL,
    "dayOfCycle" INTEGER NOT NULL,
    "sortIndex" INTEGER NOT NULL,
    "display" TEXT NOT NULL,
    "romaji" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "kanji" TEXT,
    "mora" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingWord_stage_dayOfCycle_sortIndex_key" ON "ReadingWord"("stage", "dayOfCycle", "sortIndex");

-- CreateIndex
CREATE INDEX "ReadingWord_stage_dayOfCycle_idx" ON "ReadingWord"("stage", "dayOfCycle");
