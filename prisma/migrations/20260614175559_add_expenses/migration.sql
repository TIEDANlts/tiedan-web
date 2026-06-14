-- CreateEnum
CREATE TYPE "TxnDirection" AS ENUM ('EXPENSE', 'INCOME', 'NEUTRAL');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "txnTime" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "TxnDirection" NOT NULL,
    "categoryId" TEXT,
    "merchant" TEXT,
    "item" TEXT,
    "payMethod" TEXT,
    "txnNo" TEXT,
    "note" TEXT,
    "importBatchId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "TxnDirection" NOT NULL DEFAULT 'EXPENSE',
    "icon" TEXT,
    "keywords" TEXT[],
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "inserted" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_txnTime_idx" ON "Transaction"("txnTime");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_platform_idx" ON "Transaction"("platform");

-- CreateIndex
CREATE INDEX "Transaction_importBatchId_idx" ON "Transaction"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_platform_txnNo_key" ON "Transaction"("platform", "txnNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
