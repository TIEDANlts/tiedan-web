"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
import { initialExpenseActionState } from "@/modules/expenses/action-state";
import { createManualTransactionAction } from "@/modules/expenses/actions";
import type { ExpenseCategoryOption } from "@/modules/expenses/queries";
import type { ManualDirectionValue } from "@/modules/expenses/utils";
import { categoriesForDirection, CategoryGrid, DirectionToggle, FieldError } from "./expense-ledger-parts";

export function ManualTransactionDialog({ categories, today }: { categories: ExpenseCategoryOption[]; today: string }) {
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
