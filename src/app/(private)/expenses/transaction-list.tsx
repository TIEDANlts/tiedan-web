"use client";

import { ReceiptText } from "lucide-react";

import type { ExpensePageData } from "@/modules/expenses/queries";
import { TransactionRow } from "./transaction-row";

function EmptyLedger() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-14 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-module-expenses/12 text-module-expenses">
        <ReceiptText className="size-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold text-ink">这个月还没有流水。</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-2">先手动记一笔，之后账单导入也会汇到这里。</p>
    </div>
  );
}

export function TransactionList({ data }: { data: ExpensePageData }) {
  if (data.groups.length === 0) {
    return <EmptyLedger />;
  }

  return (
    <section className="space-y-5">
      {data.groups.map((group) => (
        <div key={group.date} className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-heading text-xl font-semibold text-ink">{group.date}</h2>
            <span className="text-sm font-medium text-destructive">支出小计 {group.expenseSubtotalText}</span>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <TransactionRow key={item.id} item={item} categories={data.categories} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
