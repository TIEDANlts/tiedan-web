"use client";

import { useMemo } from "react";

import type { ExpensePageData } from "@/modules/expenses/queries";
import { ExpenseFiltersBar, MonthSwitcher } from "./expense-filter-bar";
import { ExpenseLedgerHeader } from "./expense-ledger-header";
import { ManualTransactionDialog } from "./manual-transaction-dialog";
import { TransactionList } from "./transaction-list";

export function ExpensesLedger({ data }: { data: ExpensePageData }) {
  const totalCount = useMemo(() => data.groups.reduce((sum, group) => sum + group.items.length, 0), [data.groups]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <ExpenseLedgerHeader data={data} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSwitcher data={data} />
        <span className="text-sm text-ink-2">{totalCount} 笔流水</span>
      </div>

      <ExpenseFiltersBar data={data} />
      <TransactionList data={data} />

      <div className="fixed inset-x-4 bottom-4 z-20 md:hidden">
        <ManualTransactionDialog categories={data.categories} today={data.today} />
      </div>
    </div>
  );
}
