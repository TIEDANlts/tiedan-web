"use client";

import { FolderCog, History, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ExpensePageData } from "@/modules/expenses/queries";
import { ManualTransactionDialog } from "./manual-transaction-dialog";

export function ExpenseLedgerHeader({ data }: { data: ExpensePageData }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium text-module-expenses">消费</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">消费流水</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">按月查看每一笔收入和支出，分类可以直接在列表里改。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/expense-categories">
            <FolderCog className="size-4" />
            分类管理
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/expenses/import/history">
            <History className="size-4" />
            导入历史
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/expenses/import">
            <Upload className="size-4" />
            账单导入
          </Link>
        </Button>
        <ManualTransactionDialog categories={data.categories} today={data.today} />
      </div>
    </header>
  );
}
