"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  isManualDirection,
  normalizeManualTransactionInput,
  type ManualDirectionValue,
} from "@/modules/expenses/utils";

export type ExpenseActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"amount" | "direction" | "categoryId" | "date" | "name" | "icon" | "keywords", string>>;
};

export const initialExpenseActionState: ExpenseActionState = {
  ok: false,
  message: null,
};

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理消费记录。");
  }
}

function revalidateExpenses() {
  revalidatePath("/expenses");
  revalidatePath("/admin/expense-categories");
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function readKeywords(formData: FormData) {
  return Array.from(
    new Set(
      stringValue(formData.get("keywords"))
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

async function categoryOptions() {
  const categories = await db.expenseCategory.findMany({
    select: { id: true, name: true, direction: true },
  });

  return categories.flatMap((category) =>
    category.direction === "EXPENSE" || category.direction === "INCOME"
      ? [{ ...category, direction: category.direction as ManualDirectionValue }]
      : [],
  );
}

async function nextCategorySort() {
  const aggregate = await db.expenseCategory.aggregate({
    _max: { sort: true },
  });

  return (aggregate._max.sort ?? 0) + 10;
}

function readCategoryInput(formData: FormData) {
  const name = stringValue(formData.get("name"));
  const direction = stringValue(formData.get("direction"));
  const icon = stringValue(formData.get("icon"));
  const keywords = readKeywords(formData);
  const errors: ExpenseActionState["errors"] = {};

  if (!name) {
    errors.name = "分类名称不能为空。";
  }

  if (!isManualDirection(direction)) {
    errors.direction = "请选择支出或收入。";
  }

  if (icon.length > 8) {
    errors.icon = "图标请控制在 8 个字符以内。";
  }

  if (keywords.length === 0) {
    errors.keywords = "至少保留一个关键词。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    data: {
      name,
      direction: direction as ManualDirectionValue,
      icon: icon || null,
      keywords,
    },
  };
}

export async function createManualTransactionAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  await requireSession();

  const normalized = normalizeManualTransactionInput(
    {
      amount: formData.get("amount"),
      direction: formData.get("direction"),
      categoryId: formData.get("categoryId"),
      date: formData.get("date"),
      merchant: formData.get("merchant"),
      note: formData.get("note"),
    },
    await categoryOptions(),
  );

  if (!normalized.ok) {
    return { ok: false, message: "请检查记账信息。", errors: normalized.errors };
  }

  await db.transaction.create({
    data: normalized.data,
  });

  revalidateExpenses();

  return { ok: true, message: "这一笔已记下。" };
}

export async function updateTransactionCategoryAction(id: string, categoryId: string | null) {
  await requireSession();

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

export async function deleteTransactionAction(id: string) {
  await requireSession();

  await db.transaction.deleteMany({
    where: { id },
  });

  revalidateExpenses();
}

export async function createExpenseCategoryAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  await requireSession();

  const input = readCategoryInput(formData);
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
  await requireSession();

  const id = stringValue(formData.get("id"));
  if (!id) {
    return { ok: false, message: "缺少要编辑的分类。" };
  }

  const input = readCategoryInput(formData);
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
  await requireSession();

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
  await requireSession();

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
