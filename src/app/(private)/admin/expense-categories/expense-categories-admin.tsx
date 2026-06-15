"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { TagInput } from "@/components/tag-input";
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
import { initialExpenseActionState } from "@/modules/expenses/action-state";
import {
  createExpenseCategoryAction,
  deleteExpenseCategoryAction,
  reorderExpenseCategoriesAction,
  updateExpenseCategoryAction,
} from "@/modules/expenses/actions";
import type { ExpenseCategoryAdminItem } from "@/modules/expenses/queries";
import {
  expenseDirectionLabels,
  manualDirections,
  type ManualDirectionValue,
} from "@/modules/expenses/utils";

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs text-destructive">{children}</p>;
}

function CategoryForm({ category, onDone }: { category?: ExpenseCategoryAdminItem; onDone: () => void }) {
  const action = category ? updateExpenseCategoryAction : createExpenseCategoryAction;
  const [state, setState] = useState(initialExpenseActionState);
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState<ManualDirectionValue>(category?.direction ?? "EXPENSE");
  const [keywords, setKeywords] = useState<string[]>(category?.keywords ?? []);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await action(initialExpenseActionState, formData);
          setState(result);
          if (result.ok) {
            onDone();
          }
        });
      }}
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <input type="hidden" name="keywords" value={keywords.join(",")} />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <label className="block space-y-2 text-sm font-medium text-ink">
          <span>名称</span>
          <Input name="name" defaultValue={category?.name ?? ""} className="bg-surface" />
          <FieldError>{state.errors?.name}</FieldError>
        </label>

        <label className="block space-y-2 text-sm font-medium text-ink">
          <span>图标</span>
          <Input name="icon" defaultValue={category?.icon ?? ""} placeholder="🍜" className="bg-surface text-center" />
          <FieldError>{state.errors?.icon}</FieldError>
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-ink">
        <span>方向</span>
        <select
          name="direction"
          value={direction}
          onChange={(event) => setDirection(event.target.value as ManualDirectionValue)}
          className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-ink outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          {manualDirections.map((option) => (
            <option key={option} value={option}>
              {expenseDirectionLabels[option]}
            </option>
          ))}
        </select>
        <FieldError>{state.errors?.direction}</FieldError>
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium text-ink">关键词</span>
        <TagInput value={keywords} onChange={setKeywords} placeholder="输入关键词后回车" />
        <FieldError>{state.errors?.keywords}</FieldError>
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "正在保存..." : "保存"}
        </Button>
      </div>
    </form>
  );
}

function CategoryDialog({ category }: { category?: ExpenseCategoryAdminItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button type="button" variant="outline" size="sm">
            <Edit className="size-3.5" />
            编辑
          </Button>
        ) : (
          <Button type="button">
            <Plus className="size-4" />
            新增分类
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "编辑消费分类" : "新增消费分类"}</DialogTitle>
          <DialogDescription>关键词会在后续账单导入时用于自动分类。</DialogDescription>
        </DialogHeader>
        <CategoryForm category={category} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SortableCategoryRow({
  category,
  onDelete,
}: {
  category: ExpenseCategoryAdminItem;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center",
        isDragging && "relative z-10 opacity-80 ring-2 ring-module-expenses/30",
      )}
    >
      <button
        type="button"
        className="flex size-8 cursor-grab items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label={`拖拽排序：${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-module-expenses/12 text-xl">
            {category.icon ?? "📦"}
          </span>
          <h2 className="font-medium text-ink">{category.name}</h2>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
            {expenseDirectionLabels[category.direction]}
          </span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-3">
            {category.transactionCount} 笔
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-ink-2">
          {category.keywords.length > 0 ? category.keywords.join("、") : "还没有关键词"}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <CategoryDialog category={category} />
        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" size="sm">
              <Trash2 className="size-3.5" />
              删除
            </Button>
          }
          title="删除这个分类？"
          description={`「${category.name}」下的流水会保留，但分类会变成未分类。`}
          confirmLabel="删除"
          cancelLabel="先保留"
          onConfirm={() => onDelete(category.id)}
        />
      </div>
    </div>
  );
}

export function ExpenseCategoriesAdmin({ categories }: { categories: ExpenseCategoryAdminItem[] }) {
  const [items, setItems] = useState(categories);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const counts = useMemo(
    () => ({
      expense: items.filter((item) => item.direction === "EXPENSE").length,
      income: items.filter((item) => item.direction === "INCOME").length,
    }),
    [items],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const nextItems = arrayMove(items, oldIndex, newIndex);

    setItems(nextItems);
    startTransition(async () => {
      await reorderExpenseCategoriesAction(nextItems.map((item) => item.id));
    });
  }

  function handleDelete(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    startTransition(async () => {
      await deleteExpenseCategoryAction(id);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-expenses">消费分类</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">管理消费分类</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
            维护流水分类、图标和关键词。拖动分类行即可调整展示和匹配优先级。
          </p>
        </div>
        <CategoryDialog />
      </header>

      <div className="flex flex-wrap gap-3">
        <span className="rounded-lg border border-module-expenses/35 bg-module-expenses/12 px-4 py-2 text-sm font-medium text-module-expenses">
          支出 {counts.expense} 类
        </span>
        <span className="rounded-lg border border-module-trips/35 bg-module-trips/12 px-4 py-2 text-sm font-medium text-module-trips">
          收入 {counts.income} 类
        </span>
        {isPending ? <span className="px-2 py-2 text-sm text-ink-3">正在保存顺序...</span> : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
          <h2 className="font-heading text-xl font-semibold text-ink">还没有分类。</h2>
          <p className="mt-2 text-sm leading-6 text-ink-2">先添加几个常用分类，再回到流水页记账。</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((category) => (
                <SortableCategoryRow key={category.id} category={category} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
