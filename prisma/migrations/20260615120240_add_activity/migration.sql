-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_happenedAt_idx" ON "Activity"("happenedAt");
