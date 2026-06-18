"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { TodoActionState } from "@/modules/todos/action-state";
import {
  dateToTodoDb,
  getShanghaiTodayDate,
  normalizeTodoPriority,
  readCreateTodoFormData,
} from "@/modules/todos/utils";

async function requireTodoSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理待办。");
  }
}

function revalidateTodos() {
  revalidatePath("/todos");
  revalidatePath("/");
}

export async function createTodoAction(
  _previousState: TodoActionState,
  formData: FormData,
): Promise<TodoActionState> {
  await requireTodoSession();

  const input = readCreateTodoFormData(formData);
  if (!input.ok) {
    return { ok: false, message: "请检查待办内容。", errors: input.errors };
  }

  await db.todo.create({
    data: input.data,
  });

  revalidateTodos();

  return { ok: true, message: "待办已添加。" };
}

export async function toggleTodoDoneAction(id: string, done: boolean) {
  await requireTodoSession();

  await db.todo.update({
    where: { id },
    data: {
      done,
      doneAt: done ? new Date() : null,
    },
  });

  revalidateTodos();
}

export async function updateTodoPriorityAction(id: string, priority: number) {
  await requireTodoSession();

  await db.todo.update({
    where: { id },
    data: { priority: normalizeTodoPriority(priority) },
  });

  revalidateTodos();
}

export async function updateTodoDateAction(id: string, date: string | null) {
  await requireTodoSession();

  await db.todo.update({
    where: { id },
    data: { date: dateToTodoDb(date) },
  });

  revalidateTodos();
}

export async function deleteTodoAction(id: string) {
  await requireTodoSession();

  await db.todo.delete({
    where: { id },
  });

  revalidateTodos();
}

export async function postponeOverdueTodosAction() {
  await requireTodoSession();

  const today = getShanghaiTodayDate();

  await db.todo.updateMany({
    where: {
      done: false,
      date: {
        lt: dateToTodoDb(today) ?? undefined,
      },
    },
    data: {
      date: dateToTodoDb(today),
    },
  });

  revalidateTodos();
}
