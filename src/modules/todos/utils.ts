import { dayjs, formatShanghaiDate, toShanghaiTime } from "../../lib/dayjs";

export type TodoDateValue = string | Date | null;

export type TodoDateTarget = {
  id: string;
  date: TodoDateValue;
  done: boolean;
};

export type TodoListItem = {
  id: string;
  content: string;
  date: string | null;
  priority: number;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
};

export type FutureDayGroup = {
  date: string;
  label: string;
  items: TodoListItem[];
};

export type CreateTodoFormDataResult =
  | {
      ok: true;
      data: {
        content: string;
        date: Date | null;
        priority: number;
      };
    }
  | {
      ok: false;
      errors: Partial<Record<"content" | "date" | "priority" | "target", string>>;
    };

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTodoPriority(value: FormDataEntryValue | string | number | null) {
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

export function dateToTodoDb(date: string | null) {
  return date ? new Date(`${date}T00:00:00.000Z`) : null;
}

export function readCreateTodoFormData(formData: FormData, today = getShanghaiTodayDate()): CreateTodoFormDataResult {
  const content = readString(formData.get("content"));
  const target = readString(formData.get("target")) || "today";
  const dateInput = normalizeDateInput(formData.get("date"));
  const errors: Extract<CreateTodoFormDataResult, { ok: false }>["errors"] = {};

  if (!content) {
    errors.content = "写点具体要做的事。";
  }

  let date: string | null = today;
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
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      content,
      date: dateToTodoDb(date),
      priority: normalizeTodoPriority(formData.get("priority")),
    },
  };
}

export function normalizeTodoDate(value: TodoDateValue) {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return formatShanghaiDate(value);
}

export function getShanghaiTodayDate(reference?: string | Date) {
  return formatShanghaiDate(reference);
}

export function isOverdue(todo: Pick<TodoDateTarget, "date" | "done">, today = getShanghaiTodayDate()) {
  const date = normalizeTodoDate(todo.date);

  return Boolean(date && !todo.done && date < today);
}

export function getOverdueDays(date: TodoDateValue, today = getShanghaiTodayDate()) {
  const normalizedDate = normalizeTodoDate(date);

  if (!normalizedDate || normalizedDate >= today) {
    return 0;
  }

  return dayjs(today).startOf("day").diff(dayjs(normalizedDate).startOf("day"), "day");
}

export function moveOverdueToTodayInput<T extends TodoDateTarget>(
  todos: T[],
  reference?: string | Date,
) {
  const today = getShanghaiTodayDate(reference);

  return todos
    .filter((todo) => isOverdue(todo, today))
    .map((todo) => ({
      id: todo.id,
      date: today,
    }));
}

export function sortTodosForDisplay<T extends Pick<TodoListItem, "done" | "priority" | "createdAt">>(
  todos: T[],
) {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function buildFutureDayGroups(
  todos: TodoListItem[],
  today = getShanghaiTodayDate(),
): FutureDayGroup[] {
  const groups: FutureDayGroup[] = [];

  for (let offset = 1; offset <= 7; offset += 1) {
    const date = dayjs(today).add(offset, "day").format("YYYY-MM-DD");
    const items = sortTodosForDisplay(todos.filter((todo) => todo.date === date));

    groups.push({
      date,
      label: toShanghaiTime(`${date}T00:00:00+08:00`).format("M月D日 dddd"),
      items,
    });
  }

  return groups;
}
