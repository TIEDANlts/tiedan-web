import type { CalendarEvent } from "../../lib/calendar";
import { db } from "../../lib/db";
import { formatShanghaiDate } from "../../lib/dayjs";
import { moduleColors } from "../../lib/design";

function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function getEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const todos = await db.todo.findMany({
    where: {
      date: {
        gte: dateFromInput(start),
        lt: dateFromInput(end),
      },
    },
    orderBy: [{ date: "asc" }, { done: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  return todos.map((todo) => ({
    id: `todos:${todo.id}`,
    module: "todos",
    title: todo.done ? `✓ ${todo.content}` : todo.content,
    start: formatShanghaiDate(todo.date),
    allDay: true,
    color: todo.done ? `${moduleColors.todos}99` : moduleColors.todos,
    href: "/todos",
  }));
}
