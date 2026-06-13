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
