"use client";

import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExpensePageData } from "@/modules/expenses/queries";
import {
  expenseDirectionLabels,
  expenseDirections,
  type DirectionFilter,
  type ExpenseFilters,
} from "@/modules/expenses/utils";
import { createExpenseHref } from "./expense-ledger-parts";

export function MonthSwitcher({ data }: { data: ExpensePageData }) {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={createExpenseHref(pathname, data.filters, { month: data.prevMonth })} aria-label="上个月">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <span className="px-4 font-heading text-lg font-semibold text-ink">{data.filters.month}</span>
      <Button asChild variant="ghost" size="icon">
        <Link href={createExpenseHref(pathname, data.filters, { month: data.nextMonth })} aria-label="下个月">
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

export function ExpenseFiltersBar({ data }: { data: ExpensePageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(data.filters.query);
  const [isPending, startTransition] = useTransition();

  function push(patch: Partial<ExpenseFilters>) {
    startTransition(() => {
      router.push(createExpenseHref(pathname, data.filters, patch));
    });
  }

  const hasFilters =
    data.filters.direction !== "ALL" || data.filters.categoryId || data.filters.platform || data.filters.query;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,12rem))_minmax(0,1fr)]">
        <select
          value={data.filters.direction}
          onChange={(event) => push({ direction: event.target.value as DirectionFilter, categoryId: "" })}
          className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="ALL">全部方向</option>
          {expenseDirections.map((direction) => (
            <option key={direction} value={direction}>
              {expenseDirectionLabels[direction]}
            </option>
          ))}
        </select>

        <select
          value={data.filters.categoryId}
          onChange={(event) => push({ categoryId: event.target.value })}
          className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="">全部分类</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon ? `${category.icon} ` : ""}
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={data.filters.platform}
          onChange={(event) => push({ platform: event.target.value })}
          className="h-10 rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="">全部平台</option>
          {data.platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            push({ query: query.trim() });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索商户、商品或备注"
            className="h-10 bg-surface pl-9"
          />
        </form>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={createExpenseHref(pathname, data.filters, { direction: "ALL", categoryId: "", platform: "", query: "" })}>
              清空筛选
            </Link>
          </Button>
          {isPending ? <span className="text-xs text-ink-3">正在筛选...</span> : null}
        </div>
      ) : null}
    </section>
  );
}
