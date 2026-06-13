import { db } from "@/lib/db";
import { formatShanghaiDateTime, dayjs } from "@/lib/dayjs";
import {
  buildFutureDayGroups,
  getOverdueDays,
  getShanghaiTodayDate,
  isOverdue,
  normalizeTodoDate,
  sortTodosForDisplay,
  type TodoListItem,
} from "@/modules/todos/utils";

function serializeTodo(todo: {
  id: string;
  content: string;
  date: Date | null;
  priority: number;
  done: boolean;
  doneAt: Date | null;
  createdAt: Date;
}): TodoListItem {
  return {
    id: todo.id,
    content: todo.content,
    date: normalizeTodoDate(todo.date),
    priority: todo.priority,
    done: todo.done,
    doneAt: todo.doneAt ? formatShanghaiDateTime(todo.doneAt) : null,
    createdAt: formatShanghaiDateTime(todo.createdAt),
  };
}

export type TodayTodoItem = TodoListItem & {
  overdue: boolean;
  overdueDays: number;
};

export type TodosPageData = {
  today: string;
  todayItems: TodayTodoItem[];
  inboxItems: TodoListItem[];
  futureGroups: ReturnType<typeof buildFutureDayGroups>;
  overdueCount: number;
};

function hasDate(todo: TodoListItem): todo is TodoListItem & { date: string } {
  return todo.date !== null;
}

export async function getTodosPageData(reference?: string | Date): Promise<TodosPageData> {
  const today = getShanghaiTodayDate(reference);
  const futureEnd = dayjs(today).add(7, "day").format("YYYY-MM-DD");
  const todos = (
    await db.todo.findMany({
      where: {
        OR: [
          { date: null },
          { date: { lte: new Date(`${futureEnd}T00:00:00.000Z`) } },
        ],
      },
      orderBy: [{ done: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
    })
  ).map(serializeTodo);

  const todayItems = sortTodosForDisplay(
    todos.filter((todo) => {
      if (!todo.date) {
        return false;
      }

      return todo.date === today || isOverdue(todo, today);
    }),
  ).map((todo) => ({
    ...todo,
    overdue: isOverdue(todo, today),
    overdueDays: getOverdueDays(todo.date, today),
  }));
  const inboxItems = sortTodosForDisplay(todos.filter((todo) => !todo.date));
  const futureGroups = buildFutureDayGroups(
    todos.filter((todo) => hasDate(todo) && todo.date > today && todo.date <= futureEnd),
    today,
  );

  return {
    today,
    todayItems,
    inboxItems,
    futureGroups,
    overdueCount: todayItems.filter((todo) => todo.overdue).length,
  };
}
