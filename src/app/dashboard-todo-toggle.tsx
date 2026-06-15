"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useTransition } from "react";

import { toggleTodoDoneAction } from "@/modules/todos/actions";

export function DashboardTodoToggle({ id, done }: { id: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  const Icon = done ? CheckCircle2 : Circle;

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={done ? "取消完成待办" : "完成待办"}
      title={done ? "取消完成待办" : "完成待办"}
      onClick={() => startTransition(async () => toggleTodoDoneAction(id, !done))}
      className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-pill text-primary transition hover:bg-surface-2 disabled:opacity-50"
    >
      <Icon className="size-4" />
    </button>
  );
}
