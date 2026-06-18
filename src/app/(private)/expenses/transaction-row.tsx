"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteTransactionAction } from "@/modules/expenses/actions";
import type { ExpenseCategoryOption, ExpenseTransactionItem } from "@/modules/expenses/queries";
import { directionAmountClass, directionPrefix } from "./expense-ledger-parts";
import { TransactionCategorySelect } from "./transaction-category-select";

export function TransactionRow({ item, categories }: { item: ExpenseTransactionItem; categories: ExpenseCategoryOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="flex min-w-0 gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-module-expenses/12 text-xl">
          {item.category?.icon ?? "📦"}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium text-ink">{item.merchant ?? "未填写商户"}</h3>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-3">{item.platform}</span>
          </div>
          <p className="mt-1 truncate text-sm text-ink-2">{item.displayText}</p>
          <p className="mt-1 text-xs text-ink-3">{item.txnTime}</p>
        </div>
      </div>

      <TransactionCategorySelect item={item} categories={categories} />

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className={cn("font-heading text-lg font-semibold tabular-nums", directionAmountClass(item.direction))}>
          {directionPrefix(item.direction)}
          {item.amountText}
        </span>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" size="icon" disabled={isPending}>
              <Trash2 className="size-4" />
              <span className="sr-only">删除流水</span>
            </Button>
          }
          title="删除这条流水？"
          description={`「${item.merchant ?? item.displayText}」会从消费记录中移除。`}
          confirmLabel="删除"
          cancelLabel="先保留"
          onConfirm={() => {
            startTransition(async () => {
              await deleteTransactionAction(item.id);
              router.refresh();
            });
          }}
        />
      </div>
    </div>
  );
}
