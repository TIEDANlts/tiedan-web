-- CreateTable
CREATE TABLE "SpecialDay" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "yearlyRepeat" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialDay_date_idx" ON "SpecialDay"("date");

-- CreateIndex
CREATE INDEX "SpecialDay_yearlyRepeat_idx" ON "SpecialDay"("yearlyRepeat");
