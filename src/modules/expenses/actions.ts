"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { expenseImportTitle, recordActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { buildExpenseImportPreview, normalizeImportRowsForCreate } from "@/modules/expenses/import-executor";
import { validateExpenseImportFile } from "@/modules/expenses/import-limits";
import { detectExpenseImportPlatform, parseExpenseImportFile, type ExpenseImportPlatform } from "@/modules/expenses/parsers";
import { categorizeExpenseTransaction } from "@/modules/expenses/categorize";
import { getExpenseCategoriesForCategorize, getExpenseCategoryOptions } from "@/modules/expenses/category-options";
import type { ExpenseActionState } from "@/modules/expenses/action-state";
import {
  readExpenseCategoryFormData,
  readManualTransactionFormData,
} from "@/modules/expenses/utils";

async function requireExpenseSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理消费记录。");
  }
}

function revalidateExpenses() {
  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/expenses/import");
  revalidatePath("/expenses/import/history");
  revalidatePath("/admin/expense-categories");
}

async function nextCategorySort() {
  const aggregate = await db.expenseCategory.aggregate({
    _max: { sort: true },
  });

  return (aggregate._max.sort ?? 0) + 10;
}

export async function createManualTransactionAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  await requireExpenseSession();

  const normalized = readManualTransactionFormData(formData, await getExpenseCategoryOptions());

  if (!normalized.ok) {
    return { ok: false, message: "请检查记账信息。", errors: normalized.errors };
  }

  if (!normalized.data.categoryId) {
    normalized.data.categoryId = categorizeExpenseTransaction(
      {
        direction: normalized.data.direction,
        merchant: normalized.data.merchant,
        item: normalized.data.note,
        sourceCategory: null,
      },
      await getExpenseCategoriesForCategorize(),
    );
  }

  await db.transaction.create({
    data: normalized.data,
  });

  revalidateExpenses();

  return { ok: true, message: "这一笔已记下。" };
}

export async function updateTransactionCategoryAction(id: string, categoryId: string | null) {
  await requireExpenseSession();

  const transaction = await db.transaction.findUnique({
    where: { id },
    select: { id: true, direction: true },
  });

  if (!transaction) {
    return { ok: false, message: "这条流水已经不存在。" };
  }

  const nextCategoryId = categoryId?.trim() || null;
  if (nextCategoryId) {
    const category = await db.expenseCategory.findUnique({
      where: { id: nextCategoryId },
      select: { direction: true },
    });

    if (!category) {
      return { ok: false, message: "这个分类已经不存在。" };
    }

    if (transaction.direction !== "NEUTRAL" && category.direction !== transaction.direction) {
      return { ok: false, message: "分类方向与流水方向不一致。" };
    }
  }

  await db.transaction.update({
    where: { id },
    data: { categoryId: nextCategoryId },
  });

  revalidateExpenses();

  return { ok: true, message: "分类已更新。" };
}

export async function updateTransactionCategoryWithRuleAction(
  id: string,
  categoryId: string | null,
  rememberMerchant: boolean,
) {
  await requireExpenseSession();

  const transaction = await db.transaction.findUnique({
    where: { id },
    select: { merchant: true },
  });

  const result = await updateTransactionCategoryAction(id, categoryId);
  if (!result.ok || !rememberMerchant || !categoryId || !transaction?.merchant) {
    return result;
  }

  const category = await db.expenseCategory.findUnique({
    where: { id: categoryId },
    select: { keywords: true },
  });

  if (category && !category.keywords.includes(transaction.merchant)) {
    await db.expenseCategory.update({
      where: { id: categoryId },
      data: { keywords: [...category.keywords, transaction.merchant] },
    });
  }

  revalidateExpenses();

  return { ok: true, message: "分类已更新，规则也记住了。" };
}

export async function deleteTransactionAction(id: string) {
  await requireExpenseSession();

  await db.transaction.deleteMany({
    where: { id },
  });

  revalidateExpenses();
}

export async function createExpenseCategoryAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  await requireExpenseSession();

  const input = readExpenseCategoryFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查分类信息。", errors: input.errors };
  }

  try {
    await db.expenseCategory.create({
      data: {
        ...input.data,
        sort: await nextCategorySort(),
      },
    });
  } catch {
    return { ok: false, message: "分类名称不能重复。", errors: { name: "已经有同名分类。" } };
  }

  revalidateExpenses();

  return { ok: true, message: "分类已添加。" };
}

export async function updateExpenseCategoryAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  await requireExpenseSession();

  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  if (!id) {
    return { ok: false, message: "缺少要编辑的分类。" };
  }

  const input = readExpenseCategoryFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查分类信息。", errors: input.errors };
  }

  const existing = await db.expenseCategory.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, message: "这个分类已经不存在。" };
  }

  try {
    await db.$transaction([
      db.expenseCategory.update({
        where: { id },
        data: input.data,
      }),
      db.transaction.updateMany({
        where: {
          categoryId: id,
          direction: { not: input.data.direction },
        },
        data: { categoryId: null },
      }),
    ]);
  } catch {
    return { ok: false, message: "分类名称不能重复。", errors: { name: "已经有同名分类。" } };
  }

  revalidateExpenses();

  return { ok: true, message: "分类已保存。" };
}

export async function deleteExpenseCategoryAction(id: string) {
  await requireExpenseSession();

  await db.$transaction([
    db.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    }),
    db.expenseCategory.delete({
      where: { id },
    }),
  ]);

  revalidateExpenses();
}

export async function reorderExpenseCategoriesAction(orderedIds: string[]) {
  await requireExpenseSession();

  const categories = await db.expenseCategory.findMany({
    select: { id: true },
  });
  const knownIds = new Set(categories.map((category) => category.id));
  const updates = orderedIds
    .filter((id) => knownIds.has(id))
    .map((id, index) =>
      db.expenseCategory.update({
        where: { id },
        data: { sort: (index + 1) * 10 },
      }),
    );

  await db.$transaction(updates);
  revalidateExpenses();
}

export type ExpenseImportParseState =
  | {
      ok: true;
      fileName: string;
      platform: ExpenseImportPlatform | null;
      selectedPlatform: ExpenseImportPlatform | null;
      encoding: "utf8" | "gbk";
      payload: string;
      message: string | null;
    }
  | { ok: false; message: string };

export type ExpenseImportPreviewState =
  | {
      ok: true;
      fileName: string;
      platform: ExpenseImportPlatform;
      payload: string;
      stats: ReturnType<typeof buildExpenseImportPreview>["stats"];
      rows: ReturnType<typeof buildExpenseImportPreview>["rows"];
      filteredRows: ReturnType<typeof parseExpenseImportFile>["filteredRows"];
      errors: ReturnType<typeof parseExpenseImportFile>["errors"];
    }
  | { ok: false; message: string };

export type ExpenseImportExecuteState =
  | {
      ok: true;
      batchId: string;
      inserted: number;
      skipped: number;
      total: number;
    }
  | { ok: false; message: string };

function encodePayload(buffer: Buffer) {
  return buffer.toString("base64");
}

function decodePayload(payload: string) {
  return Buffer.from(payload, "base64");
}

function isExpenseImportPlatform(value: string): value is ExpenseImportPlatform {
  return value === "alipay" || value === "wechat";
}

async function existingTxnNos(platform: ExpenseImportPlatform, txnNos: string[]) {
  const rows = await db.transaction.findMany({
    where: { platform, txnNo: { in: txnNos } },
    select: { txnNo: true },
  });

  return new Set(rows.flatMap((row) => (row.txnNo ? [row.txnNo] : [])));
}

export async function parseExpenseImportFileAction(formData: FormData): Promise<ExpenseImportParseState> {
  await requireExpenseSession();

  const validation = validateExpenseImportFile(formData.get("file"));
  if (!validation.ok) {
    return validation;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "请选择要导入的微信或支付宝 CSV 文件。" };
  }

  if (!/\.csv$/i.test(file.name)) {
    return { ok: false, message: "账单导入只支持 CSV 文件。" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectExpenseImportPlatform(buffer);

  return {
    ok: true,
    fileName: file.name,
    platform: detected.platform,
    selectedPlatform: detected.platform,
    encoding: detected.encoding,
    payload: encodePayload(buffer),
    message: detected.platform ? null : "没有自动识别出平台，请手动选择微信或支付宝。",
  };
}

export async function previewExpenseImportAction(input: {
  payload: string;
  fileName: string;
  platform: ExpenseImportPlatform;
}): Promise<ExpenseImportPreviewState> {
  await requireExpenseSession();

  if (!isExpenseImportPlatform(input.platform)) {
    return { ok: false, message: "请选择账单平台。" };
  }

  const parsed = parseExpenseImportFile(decodePayload(input.payload), input.platform);
  const existing = await existingTxnNos(input.platform, parsed.rows.map((row) => row.txnNo));
  const preview = buildExpenseImportPreview(parsed, await getExpenseCategoriesForCategorize(), existing);

  return {
    ok: true,
    fileName: input.fileName,
    platform: input.platform,
    payload: input.payload,
    stats: preview.stats,
    rows: preview.rows,
    filteredRows: parsed.filteredRows,
    errors: parsed.errors,
  };
}

export async function executeExpenseImportAction(input: {
  payload: string;
  fileName: string;
  platform: ExpenseImportPlatform;
}): Promise<ExpenseImportExecuteState> {
  await requireExpenseSession();

  if (!isExpenseImportPlatform(input.platform)) {
    return { ok: false, message: "请选择账单平台。" };
  }

  const parsed = parseExpenseImportFile(decodePayload(input.payload), input.platform);
  const existingBefore = await existingTxnNos(input.platform, parsed.rows.map((row) => row.txnNo));
  const categories = await getExpenseCategoriesForCategorize();

  const result = await db.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        platform: input.platform,
        filename: input.fileName,
        total: parsed.rows.length,
        inserted: 0,
        skipped: existingBefore.size + parsed.filteredRows.length,
      },
    });
    let inserted = 0;
    let skipped = existingBefore.size + parsed.filteredRows.length;

    for (const row of normalizeImportRowsForCreate(parsed, categories, existingBefore, batch.id)) {
      try {
        await tx.transaction.create({ data: row });
        inserted += 1;
      } catch {
        skipped += 1;
      }
    }

    await tx.importBatch.update({
      where: { id: batch.id },
      data: { inserted, skipped },
    });

    return { batchId: batch.id, inserted, skipped, total: parsed.rows.length };
  });

  revalidateExpenses();
  revalidatePath(`/expenses/import/result/${result.batchId}`);

  if (result.inserted > 0) {
    await recordActivity("expenses", "imported", result.batchId, expenseImportTitle(result.inserted));
  }

  return { ok: true, ...result };
}
