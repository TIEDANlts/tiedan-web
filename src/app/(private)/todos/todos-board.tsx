"use client";

import { CalendarDays, Check, ChevronDown, Clock3, Inbox, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  createTodoAction,
  deleteTodoAction,
  postponeOverdueTodosAction,
  toggleTodoDoneAction,
  updateTodoDateAction,
  updateTodoPriorityAction,
  type TodoActionState,
} from "@/modules/todos/actions";
import type { TodayTodoItem, TodosPageData } from "@/modules/todos/queries";
import type { FutureDayGroup, TodoListItem } from "@/modules/todos/utils";

const initialState: TodoActionState = {
  ok: false,
  message: null,
};

const targetOptions = [
  { value: "today", label: "今天" },
  { value: "inbox", label: "收集箱" },
  { value: "date", label: "选日期" },
] as const;

type AddTarget = (typeof targetOptions)[number]["value"];

function priorityLabel(priority: number) {
  if (priority === 2) {
    return "紧急";
  }

  if (priority === 1) {
    return "重要";
  }

  return "普通";
}

function priorityClass(priority: number) {
  if (priority === 2) {
    return "border-module-todos bg-module-todos text-white hover:bg-module-todos/90";
  }

  if (priority === 1) {
    return "border-module-todos/40 bg-module-todos/15 text-ink hover:bg-module-todos/20";
  }

  return "border-border bg-surface text-ink-2 hover:bg-surface-2";
}

function SectionShell({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-module-todos/12 text-module-todos">
            {icon}
          </span>
          <div>
            <h2 className="font-heading text-xl font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-2">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function QuickAdd({ today }: { today: string }) {
  const [target, setTarget] = useState<AddTarget>("today");
  const [pickedDate, setPickedDate] = useState(today);
  const [state, formAction, pending] = useActionState(createTodoAction, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="sticky top-3 z-20 rounded-xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/80"
    >
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="date" value={target === "date" ? pickedDate : ""} />

      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="justify-between sm:w-32">
              {targetOptions.find((option) => option.value === target)?.label}
              <ChevronDown className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 space-y-2">
            {targetOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-ink hover:bg-surface-2",
                  target === option.value && "bg-module-todos/12 text-module-todos",
                )}
                onClick={() => setTarget(option.value)}
              >
                {option.label}
                {target === option.value ? <Check className="size-4" /> : null}
              </button>
            ))}
            {target === "date" ? (
              <label className="block space-y-1 border-t border-border pt-2 text-xs font-medium text-ink-2">
                <span>目标日期</span>
                <Input
                  type="date"
                  value={pickedDate}
                  onChange={(event) => setPickedDate(event.target.value)}
                  className="bg-surface"
                />
              </label>
            ) : null}
          </PopoverContent>
        </Popover>

        <Input
          ref={inputRef}
          name="content"
          placeholder="输入待办，回车添加"
          autoComplete="off"
          className="h-10 bg-surface text-base md:text-sm"
        />

        <Button type="submit" disabled={pending} className="h-10">
          <Plus className="size-4" />
          {pending ? "添加中" : "添加"}
        </Button>
      </div>

      {state.message && !state.ok ? (
        <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function DatePopoverContent({
  todo,
  onSaved,
}: {
  todo: TodoListItem;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todo.date ?? "");
  const [isPending, startTransition] = useTransition();

  function save(nextDate: string | null) {
    startTransition(async () => {
      await updateTodoDateAction(todo.id, nextDate);
      onSaved();
    });
  }

  return (
    <PopoverContent align="end" className="w-64 space-y-3">
      <label className="block space-y-1 text-sm font-medium text-ink">
        <span>安排日期</span>
        <Input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="bg-surface"
        />
      </label>
      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => save(null)} disabled={isPending}>
          放回收集箱
        </Button>
        <Button type="button" size="sm" onClick={() => save(date || null)} disabled={isPending}>
          保存日期
        </Button>
      </div>
    </PopoverContent>
  );
}

function DatePopover({ todo }: { todo: TodoListItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-ink-2">
          <CalendarDays className="size-3.5" />
          {todo.date ?? "收集箱"}
        </Button>
      </PopoverTrigger>
      {open ? <DatePopoverContent key={`${todo.id}:${todo.date ?? "inbox"}`} todo={todo} onSaved={() => setOpen(false)} /> : null}
    </Popover>
  );
}

function TodoRow({ todo }: { todo: TodayTodoItem | TodoListItem }) {
  const [isPending, startTransition] = useTransition();
  const overdue = "overdue" in todo ? todo.overdue : false;
  const overdueDays = "overdueDays" in todo ? todo.overdueDays : 0;

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-opacity sm:grid-cols-[auto_1fr_auto]",
        todo.done && "opacity-70",
        overdue && !todo.done && "border-destructive/30 bg-destructive/5",
        isPending && "opacity-50",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex size-7 items-center justify-center rounded-full border text-xs transition-colors",
          todo.done
            ? "border-module-todos bg-module-todos text-white"
            : "border-module-todos/40 bg-surface text-module-todos hover:bg-module-todos/10",
        )}
        aria-label={todo.done ? "取消完成" : "标记完成"}
        onClick={() => run(() => toggleTodoDoneAction(todo.id, !todo.done))}
      >
        {todo.done ? <Check className="size-4" /> : null}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("break-words text-sm font-medium text-ink", todo.done && "line-through")}>
            {todo.content}
          </p>
          {overdue && !todo.done ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              逾期 {overdueDays} 天
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-ink-3">
          创建于 {todo.createdAt}
          {todo.doneAt ? ` · 完成于 ${todo.doneAt}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className={priorityClass(todo.priority)}>
              {priorityLabel(todo.priority)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 space-y-1">
            {[0, 1, 2].map((priority) => (
              <button
                key={priority}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-surface-2",
                  todo.priority === priority && "bg-module-todos/12 text-module-todos",
                )}
                onClick={() => run(() => updateTodoPriorityAction(todo.id, priority))}
              >
                {priorityLabel(priority)}
                {todo.priority === priority ? <Check className="size-4" /> : null}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <DatePopover todo={todo} />

        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" size="icon-sm" aria-label="删除待办">
              <Trash2 className="size-4" />
            </Button>
          }
          title="删除这条待办？"
          description={`「${todo.content}」会从待办列表中移除。`}
          confirmLabel="删除"
          onConfirm={() => run(() => deleteTodoAction(todo.id))}
        />
      </div>
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-ink-2">
      {children}
    </div>
  );
}

function TodoList({ items, empty }: { items: Array<TodayTodoItem | TodoListItem>; empty: string }) {
  if (items.length === 0) {
    return <EmptyMessage>{empty}</EmptyMessage>;
  }

  return (
    <div className="space-y-2">
      {items.map((todo) => (
        <TodoRow key={todo.id} todo={todo} />
      ))}
    </div>
  );
}

function FutureGroups({ groups }: { groups: FutureDayGroup[] }) {
  const hasAny = useMemo(() => groups.some((group) => group.items.length > 0), [groups]);

  if (!hasAny) {
    return <EmptyMessage>接下来一周还没有安排，先把脑子里的事放进收集箱。</EmptyMessage>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) =>
        group.items.length > 0 ? (
          <section key={group.date} className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">{group.label}</h3>
              <p className="text-xs text-ink-3">{group.date}</p>
            </div>
            <TodoList items={group.items} empty="" />
          </section>
        ) : null,
      )}
    </div>
  );
}

export function TodosBoard({ data }: { data: TodosPageData }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <div className="border-b border-border pb-5">
        <p className="mb-2 text-sm font-medium text-module-todos">待办</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">今天先做哪几件事</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">
          把未安排的想法丢进收集箱，把今天要处理的事情留在手边。逾期项目会自动推到今天顶部。
        </p>
      </div>

      <QuickAdd today={data.today} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <SectionShell
          title="今天"
          description={`包含今天和逾期未完成的待办。${data.overdueCount > 0 ? `有 ${data.overdueCount} 条逾期。` : "没有逾期。"} `}
          icon={<Clock3 className="size-5" />}
          action={
            data.overdueCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await postponeOverdueTodosAction();
                  })
                }
              >
                全部顺延到今天
              </Button>
            ) : null
          }
        >
          <TodoList items={data.todayItems} empty="今天没有待办 🎉" />
        </SectionShell>

        <SectionShell
          title="收集箱"
          description="还没安排日期的事项先放在这里。"
          icon={<Inbox className="size-5" />}
        >
          <TodoList items={data.inboxItems} empty="收集箱很干净，想到什么再丢进来。" />
        </SectionShell>
      </div>

      <SectionShell
        title="未来 7 天"
        description="从明天开始往后看一周，跨月也按实际日期分组。"
        icon={<CalendarDays className="size-5" />}
      >
        <FutureGroups groups={data.futureGroups} />
      </SectionShell>
    </div>
  );
}
