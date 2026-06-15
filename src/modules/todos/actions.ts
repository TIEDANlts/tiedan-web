"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getShanghaiTodayDate } from "@/modules/todos/utils";

export type TodoActionState = {
  ok: boolean;
  message: string | null;
  errors?: Partial<Record<"content" | "date" | "priority" | "target", string>>;
};

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("请先登录后再管理待办。");
  }
}

function revalidateTodos() {
  revalidatePath("/todos");
  revalidatePath("/");
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePriority(value: FormDataEntryValue | string | number | null) {
  const priority = Number(value);

  if (priority === 0 || priority === 1 || priority === 2) {
    return priority;
  }

  return 0;
}

function normalizeDateInput(value: FormDataEntryValue | string | null) {
  const date = typeof value === "string" ? value.trim() : "";

  if (!date) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  return date;
}

function dateToDb(date: string | null) {
  return date ? new Date(`${date}T00:00:00.000Z`) : null;
}

export async function createTodoAction(
  _previousState: TodoActionState,
  formData: FormData,
): Promise<TodoActionState> {
  await requireSession();

  const content = readString(formData.get("content"));
  const target = readString(formData.get("target")) || "today";
  const dateInput = normalizeDateInput(formData.get("date"));
  const errors: TodoActionState["errors"] = {};

  if (!content) {
    errors.content = "写点具体要做的事。";
  }

  let date: string | null = getShanghaiTodayDate();
  if (target === "inbox") {
    date = null;
  } else if (target === "date") {
    if (!dateInput) {
      errors.date = "请选择一个日期。";
    }
    date = dateInput;
  } else if (target !== "today") {
    errors.target = "请选择有效的添加位置。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "请检查待办内容。", errors };
  }

  await db.todo.create({
    data: {
      content,
      date: dateToDb(date),
      priority: normalizePriority(formData.get("priority")),
    },
  });

  revalidateTodos();

  return { ok: true, message: "待办已添加。" };
}

export async function toggleTodoDoneAction(id: string, done: boolean) {
  await requireSession();

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
  await requireSession();

  await db.todo.update({
    where: { id },
    data: { priority: normalizePriority(priority) },
  });

  revalidateTodos();
}

export async function updateTodoDateAction(id: string, date: string | null) {
  await requireSession();

  await db.todo.update({
    where: { id },
    data: { date: dateToDb(date) },
  });

  revalidateTodos();
}

export async function deleteTodoAction(id: string) {
  await requireSession();

  await db.todo.delete({
    where: { id },
  });

  revalidateTodos();
}

export async function postponeOverdueTodosAction() {
  await requireSession();

  const today = getShanghaiTodayDate();

  await db.todo.updateMany({
    where: {
      done: false,
      date: {
        lt: dateToDb(today) ?? undefined,
      },
    },
    data: {
      date: dateToDb(today),
    },
  });

  revalidateTodos();
}
