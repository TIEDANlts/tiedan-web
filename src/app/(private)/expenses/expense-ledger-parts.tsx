"use client";

import { cn } from "@/lib/utils";
import type { ExpenseCategoryOption } from "@/modules/expenses/queries";
import {
  expenseDirectionLabels,
  manualDirections,
  type ExpenseFilters,
  type ManualDirectionValue,
  type TxnDirectionValue,
} from "@/modules/expenses/utils";

export function createExpenseHref(pathname: string, filters: ExpenseFilters, patch: Partial<ExpenseFilters>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();

  params.set("month", next.month);
  if (next.date) {
    params.set("date", next.date);
  }
  if (next.direction !== "ALL") {
    params.set("direction", next.direction);
  }
  if (next.categoryId) {
    params.set("category", next.categoryId);
  }
  if (next.platform) {
    params.set("platform", next.platform);
  }
  if (next.query) {
    params.set("q", next.query);
  }

  return `${pathname}?${params.toString()}`;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

export function directionAmountClass(direction: TxnDirectionValue) {
  if (direction === "EXPENSE") {
    return "text-destructive";
  }

  if (direction === "INCOME") {
    return "text-module-trips";
  }

  return "text-ink-3";
}

export function directionPrefix(direction: TxnDirectionValue) {
  if (direction === "EXPENSE") {
    return "-";
  }

  if (direction === "INCOME") {
    return "+";
  }

  return "";
}

export function categoriesForDirection(categories: ExpenseCategoryOption[], direction: ManualDirectionValue) {
  return categories.filter((category) => category.direction === direction);
}

export function DirectionToggle({
  value,
  onChange,
}: {
  value: ManualDirectionValue;
  onChange: (value: ManualDirectionValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1">
      {manualDirections.map((direction) => (
        <button
          key={direction}
          type="button"
          onClick={() => onChange(direction)}
          className={cn(
            "h-10 rounded-md text-sm font-medium transition",
            value === direction ? "bg-module-expenses text-white shadow-sm" : "text-ink-2 hover:bg-surface hover:text-ink",
          )}
        >
          {expenseDirectionLabels[direction]}
        </button>
      ))}
    </div>
  );
}

export function CategoryGrid({
  categories,
  direction,
  value,
  onChange,
}: {
  categories: ExpenseCategoryOption[];
  direction: ManualDirectionValue;
  value: string;
  onChange: (value: string) => void;
}) {
  const filtered = categoriesForDirection(categories, direction);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {filtered.map((category) => {
        const active = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm font-medium transition",
              active
                ? "border-module-expenses bg-module-expenses text-white shadow-sm"
                : "border-border bg-surface text-ink hover:border-module-expenses/45",
            )}
          >
            <span className="text-2xl leading-none">{category.icon ?? "📦"}</span>
            <span className="max-w-full truncate">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
