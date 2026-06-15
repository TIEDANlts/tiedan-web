import type { Prisma } from "@prisma/client";

import { categorizeExpenseTransaction, type ExpenseCategoryForCategorize } from "./categorize";
import type { ParsedExpenseImportFile, ParsedExpenseImportRow } from "./parsers";

export type ExpenseImportPreviewRow = ParsedExpenseImportRow & {
  rowNumber: number;
  categoryId: string | null;
  duplicate: boolean;
  importable: boolean;
};

export type ExpenseImportPreview = {
  stats: {
    parsed: number;
    willImport: number;
    duplicate: number;
    filtered: number;
    failed: number;
  };
  rows: ExpenseImportPreviewRow[];
};

export type ExpenseImportCreateRow = {
  platform: string;
  txnTime: Date;
  amount: string;
  direction: ParsedExpenseImportRow["direction"];
  categoryId: string | null;
  merchant: string | null;
  item: string | null;
  payMethod: string | null;
  txnNo: string;
  note: string | null;
  importBatchId: string;
  raw: Prisma.InputJsonValue;
};

function toTransactionDate(txnTime: string) {
  return new Date(`${txnTime.replace(" ", "T")}+08:00`);
}

function categoryIdFor(row: ParsedExpenseImportRow, categories: ExpenseCategoryForCategorize[]) {
  return categorizeExpenseTransaction(
    {
      direction: row.direction,
      merchant: row.merchant,
      item: row.item,
      sourceCategory: row.sourceCategory,
    },
    categories,
  );
}

export function buildExpenseImportPreview(
  parsed: ParsedExpenseImportFile,
  categories: ExpenseCategoryForCategorize[],
  existingTxnNos: Set<string>,
): ExpenseImportPreview {
  const rows = parsed.rows.slice(0, 50).map<ExpenseImportPreviewRow>((row, index) => {
    const duplicate = existingTxnNos.has(row.txnNo);

    return {
      ...row,
      rowNumber: index + 1,
      categoryId: categoryIdFor(row, categories),
      duplicate,
      importable: !duplicate,
    };
  });
  const duplicate = parsed.rows.filter((row) => existingTxnNos.has(row.txnNo)).length;

  return {
    stats: {
      parsed: parsed.rows.length,
      willImport: parsed.rows.length - duplicate,
      duplicate,
      filtered: parsed.filteredRows.length,
      failed: parsed.errors.length,
    },
    rows,
  };
}

export function normalizeImportRowsForCreate(
  parsed: ParsedExpenseImportFile,
  categories: ExpenseCategoryForCategorize[],
  existingTxnNos: Set<string>,
  importBatchId: string,
): ExpenseImportCreateRow[] {
  return parsed.rows
    .filter((row) => !existingTxnNos.has(row.txnNo))
    .map((row) => ({
      platform: parsed.platform,
      txnTime: toTransactionDate(row.txnTime),
      amount: row.amount,
      direction: row.direction,
      categoryId: categoryIdFor(row, categories),
      merchant: row.merchant,
      item: row.item,
      payMethod: row.payMethod,
      txnNo: row.txnNo,
      note: null,
      importBatchId,
      raw: row.raw,
    }));
}
