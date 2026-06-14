"use client";

import { ArrowLeft, ArrowRight, FolderCog, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createManualTransactionAction,
  deleteTransactionAction,
  initialExpenseActionState,
  updateTransactionCategoryAction,
} from "@/modules/expenses/actions";
import type { ExpenseCategoryOption, ExpensePageData, ExpenseTransactionItem } from "@/modules/expenses/queries";
import {
  expenseDirectionLabels,
  expenseDirections,
  manualDirections,
  type DirectionFilter,
  type ExpenseFilters,
  type ManualDirectionValue,
  type TxnDirectionValue,
} from "@/modules/expenses/utils";

function createHref(pathname: string, filters: ExpenseFilters, patch: Partial<ExpenseFilters>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();

  params.set("month", next.month);
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

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

function directionAmountClass(direction: TxnDirectionValue) {
  if (direction === "EXPENSE") {
    return "text-destructive";
  }

  if (direction === "INCOME") {
    return "text-module-trips";
  }

  return "text-ink-3";
}

function directionPrefix(direction: TxnDirectionValue) {
  if (direction === "EXPENSE") {
    return "-";
  }

  if (direction === "INCOME") {
    return "+";
  }

  return "";
}

function categoriesForDirection(categories: ExpenseCategoryOption[], direction: ManualDirectionValue) {
  return categories.filter((category) => category.direction === direction);
}

function DirectionToggle({
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

function CategoryGrid({
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

function ManualTransactionDialog({ categories, today }: { categories: ExpenseCategoryOption[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialExpenseActionState);
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState<ManualDirectionValue>("EXPENSE");
  const defaultCategory = categoriesForDirection(categories, direction)[0]?.id ?? "";
  const [categoryId, setCategoryId] = useState(defaultCategory);
  const directionCategories = categoriesForDirection(categories, direction);
  const selectedCategoryId = directionCategories.some((category) => category.id === categoryId)
    ? categoryId
    : directionCategories[0]?.id ?? "";

  function changeDirection(nextDirection: ManualDirectionValue) {
    setDirection(nextDirection);
    setCategoryId(categoriesForDirection(categories, nextDirection)[0]?.id ?? "");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setState(initialExpenseActionState);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          记一笔
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>记一笔</DialogTitle>
          <DialogDescription>手动记录会保存为 manual 平台流水。</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              const result = await createManualTransactionAction(initialExpenseActionState, formData);
              setState(result);
              if (result.ok) {
                form.reset();
                router.refresh();
                setOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="direction" value={direction} />
          <input type="hidden" name="categoryId" value={selectedCategoryId} />

          <label className="block space-y-2 text-sm font-medium text-ink">
            <span>金额</span>
            <Input
              name="amount"
              inputMode="decimal"
              autoFocus
              placeholder="0.00"
              className="h-16 bg-surface text-4xl font-semibold tabular-nums"
            />
            <FieldError>{state.errors?.amount}</FieldError>
          </label>

          <DirectionToggle value={direction} onChange={changeDirection} />
          <FieldError>{state.errors?.direction}</FieldError>

          <div className="space-y-2">
            <span className="text-sm font-medium text-ink">分类</span>
            <CategoryGrid categories={categories} direction={direction} value={selectedCategoryId} onChange={setCategoryId} />
            <FieldError>{state.errors?.categoryId}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium text-ink">
              <span>日期</span>
              <Input name="date" type="date" defaultValue={today} className="bg-surface" />
              <FieldError>{state.errors?.date}</FieldError>
            </label>
            <label className="block space-y-2 text-sm font-medium text-ink">
              <span>商户</span>
              <Input name="merchant" placeholder="比如 星巴克" className="bg-surface" />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-medium text-ink">
            <span>备注</span>
            <Input name="note" placeholder="写点具体买了什么" className="bg-surface" />
          </label>

          {state.message ? (
            <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "正在保存..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MonthSwitcher({ data }: { data: ExpensePageData }) {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={createHref(pathname, data.filters, { month: data.prevMonth })} aria-label="上个月">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <span className="px-4 font-heading text-lg font-semibold text-ink">{data.filters.month}</span>
      <Button asChild variant="ghost" size="icon">
        <Link href={createHref(pathname, data.filters, { month: data.nextMonth })} aria-label="下个月">
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function FiltersBar({ data }: { data: ExpensePageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(data.filters.query);
  const [isPending, startTransition] = useTransition();

  function push(patch: Partial<ExpenseFilters>) {
    startTransition(() => {
      router.push(createHref(pathname, data.filters, patch));
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
            <Link href={createHref(pathname, data.filters, { direction: "ALL", categoryId: "", platform: "", query: "" })}>
              清空筛选
            </Link>
          </Button>
          {isPending ? <span className="text-xs text-ink-3">正在筛选...</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function CategorySelect({
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

  return (
    <div className="flex items-center gap-2">
      <select
        value={item.categoryId ?? ""}
        onChange={(event) => {
          const nextCategoryId = event.target.value || null;
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

function TransactionRow({ item, categories }: { item: ExpenseTransactionItem; categories: ExpenseCategoryOption[] }) {
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

      <CategorySelect item={item} categories={categories} />

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

export function ExpensesLedger({ data }: { data: ExpensePageData }) {
  const totalCount = useMemo(() => data.groups.reduce((sum, group) => sum + group.items.length, 0), [data.groups]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
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
          <ManualTransactionDialog categories={data.categories} today={data.today} />
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSwitcher data={data} />
        <span className="text-sm text-ink-2">{totalCount} 笔流水</span>
      </div>

      <FiltersBar data={data} />

      {data.groups.length === 0 ? (
        <EmptyLedger />
      ) : (
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
      )}

      <div className="fixed inset-x-4 bottom-4 z-20 md:hidden">
        <ManualTransactionDialog categories={data.categories} today={data.today} />
      </div>
    </div>
  );
}
