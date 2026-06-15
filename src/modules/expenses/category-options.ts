import type { ExpenseCategoryForCategorize } from "@/modules/expenses/categorize";
import type { ManualDirectionValue } from "@/modules/expenses/utils";

export async function getExpenseCategoryOptions() {
  const { db } = await import("@/lib/db");
  const categories = await db.expenseCategory.findMany({
    select: { id: true, name: true, direction: true },
  });

  return categories.flatMap((category) =>
    category.direction === "EXPENSE" || category.direction === "INCOME"
      ? [{ ...category, direction: category.direction as ManualDirectionValue }]
      : [],
  );
}

export async function getExpenseCategoriesForCategorize(): Promise<ExpenseCategoryForCategorize[]> {
  const { db } = await import("@/lib/db");
  const categories = await db.expenseCategory.findMany({
    select: { id: true, name: true, direction: true, keywords: true, sort: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });

  return categories.flatMap((category) =>
    category.direction === "EXPENSE" || category.direction === "INCOME"
      ? [{ ...category, direction: category.direction as ManualDirectionValue }]
      : [],
  );
}
