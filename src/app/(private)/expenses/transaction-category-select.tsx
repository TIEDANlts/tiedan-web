"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  updateTransactionCategoryAction,
  updateTransactionCategoryWithRuleAction,
} from "@/modules/expenses/actions";
import type { ExpenseCategoryOption, ExpenseTransactionItem } from "@/modules/expenses/queries";

export function TransactionCategorySelect({
  item,
  categories,
}: {
  item: ExpenseTransactionItem;
  categories: ExpenseCategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const options =
    item.direction === "NEUTRAL" ? categories : categories.filter((category) => category.direction === item.direction);

  function updateCategory(nextCategoryId: string | null, rememberMerchant: boolean) {
    startTransition(async () => {
      await updateTransactionCategoryWithRuleAction(item.id, nextCategoryId, rememberMerchant);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={item.categoryId ?? ""}
        onChange={(event) => {
          const nextCategoryId = event.target.value || null;
          const nextCategory = options.find((category) => category.id === nextCategoryId);
          if (item.merchant && nextCategory) {
            updateCategory(
              nextCategoryId,
              window.confirm(`以后把『${item.merchant}』都归到${nextCategory.name}分类？`),
            );
            return;
          }

          startTransition(async () => {
            await updateTransactionCategoryAction(item.id, nextCategoryId);
            router.refresh();
          });
        }}
        className="h-9 max-w-36 rounded-md border border-input bg-surface px-2 text-xs text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
      >
        <option value="">未分类</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.icon ? `${category.icon} ` : ""}
            {category.name}
          </option>
        ))}
      </select>
      {isPending ? <span className="text-xs text-ink-3">保存中</span> : null}
    </div>
  );
}
