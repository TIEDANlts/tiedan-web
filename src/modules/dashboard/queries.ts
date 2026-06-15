import { PostStatus, Prisma } from "@prisma/client";

import { getRecentActivityGroups } from "@/lib/activity";
import type { CalendarEvent } from "@/lib/calendar";
import { db } from "@/lib/db";
import { dayjs, formatShanghaiDate, SHANGHAI_TIMEZONE, toShanghaiTime } from "@/lib/dayjs";
import { formatMoney, sumMoney } from "@/lib/money";
import { monthRange, shiftMonth } from "@/modules/expenses/utils";
import { getShanghaiTodayDate, isOverdue, normalizeTodoDate, sortTodosForDisplay } from "@/modules/todos/utils";

function money(value: Prisma.Decimal.Value = 0) {
  return new Prisma.Decimal(value);
}

function yearRange() {
  const year = toShanghaiTime().year();
  return {
    year,
    start: dayjs.tz(`${year}-01-01T00:00:00`, SHANGHAI_TIMEZONE).toDate(),
    end: dayjs.tz(`${year + 1}-01-01T00:00:00`, SHANGHAI_TIMEZONE).toDate(),
  };
}

function currentMonth() {
  return toShanghaiTime().format("YYYY-MM");
}

function comparePercent(current: Prisma.Decimal, previous: Prisma.Decimal) {
  if (previous.eq(0)) {
    return { text: "--", trend: "flat" as const };
  }
  const value = current.minus(previous).div(previous).mul(100);
  return {
    text: `${value.toFixed(1)}%`,
    trend: value.gt(0) ? ("up" as const) : value.lt(0) ? ("down" as const) : ("flat" as const),
  };
}

function startOfShanghaiDay(date: string) {
  return dayjs.tz(`${date}T00:00:00`, SHANGHAI_TIMEZONE).toDate();
}

function dateOnlyToDb(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function getDashboardTodos() {
  const today = getShanghaiTodayDate();
  const rows = await db.todo.findMany({
    where: {
      done: false,
      date: {
        lte: dateOnlyToDb(today),
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 8,
  });
  const todos = rows.map((todo) => ({
    id: todo.id,
    content: todo.content,
    date: normalizeTodoDate(todo.date),
    priority: todo.priority,
    done: todo.done,
    doneAt: todo.doneAt ? toShanghaiTime(todo.doneAt).format("YYYY-MM-DD HH:mm") : null,
    createdAt: toShanghaiTime(todo.createdAt).format("YYYY-MM-DD HH:mm"),
  }));

  return {
    today,
    overdueCount: todos.filter((todo) => isOverdue(todo, today)).length,
    items: sortTodosForDisplay(todos).map((todo) => ({
      ...todo,
      overdue: isOverdue(todo, today),
    })),
  };
}

export async function getDashboardRecentGames() {
  return db.game.findMany({
    where: { playtime2w: { gt: 0 } },
    orderBy: [{ playtime2w: "desc" }, { lastPlayedAt: { sort: "desc", nulls: "last" } }],
    take: 3,
    select: {
      id: true,
      name: true,
      coverUrl: true,
      playtime2w: true,
      lastPlayedAt: true,
    },
  });
}

export async function getDashboardDoingMedia() {
  return db.mediaItem.findMany({
    where: { status: "DOING" },
    orderBy: [{ startedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 8,
    select: {
      id: true,
      type: true,
      title: true,
      coverUrl: true,
      creator: true,
    },
  });
}

export async function getDashboardExpenseMonth() {
  const month = currentMonth();
  const range = monthRange(month);
  const previousRange = monthRange(shiftMonth(month, -1));
  const [currentRows, previousRows, categoryRows, categories] = await Promise.all([
    db.transaction.findMany({
      where: { txnTime: { gte: range.start, lt: range.end }, direction: "EXPENSE" },
      select: { amount: true },
    }),
    db.transaction.findMany({
      where: { txnTime: { gte: previousRange.start, lt: previousRange.end }, direction: "EXPENSE" },
      select: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { txnTime: { gte: range.start, lt: range.end }, direction: "EXPENSE" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 3,
    }),
    db.expenseCategory.findMany({
      select: { id: true, name: true, icon: true },
    }),
  ]);
  const total = sumMoney(currentRows.map((row) => row.amount));
  const previous = sumMoney(previousRows.map((row) => row.amount));
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return {
    month,
    total: total.toFixed(2),
    totalText: formatMoney(total),
    mom: comparePercent(total, previous),
    topCategories: categoryRows.map((row) => {
      const amount = row._sum.amount ?? money(0);
      const category = row.categoryId ? categoryMap.get(row.categoryId) : null;
      const share = total.eq(0) ? money(0) : amount.div(total).mul(100);

      return {
        name: category?.name ?? "未分类",
        icon: category?.icon ?? null,
        amount: amount.toFixed(2),
        amountText: formatMoney(amount),
        share: share.toFixed(1),
      };
    }),
  };
}

export async function getDashboardNextTrip() {
  const today = startOfShanghaiDay(getShanghaiTodayDate());
  const trip = await db.trip.findFirst({
    where: {
      status: "PLANNED",
      endDate: { gte: today },
    },
    orderBy: [{ startDate: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      destinations: true,
      coverUrl: true,
    },
  });

  if (!trip) {
    return null;
  }

  const todayDay = dayjs.tz(`${getShanghaiTodayDate()}T00:00:00`, SHANGHAI_TIMEZONE);
  const start = toShanghaiTime(trip.startDate);
  const diffDays = Math.max(0, start.startOf("day").diff(todayDay, "day"));

  return {
    ...trip,
    startDate: formatShanghaiDate(trip.startDate),
    endDate: formatShanghaiDate(trip.endDate),
    countdown: diffDays,
  };
}

export async function getDashboardSpecialDays() {
  const { getEvents } = await import("@/modules/special-days/events");
  const start = getShanghaiTodayDate();
  const end = dayjs(start).add(14, "day").format("YYYY-MM-DD");
  const events = await getEvents(start, end);

  return events.slice(0, 8).map((event: CalendarEvent) => ({
    id: event.id,
    title: event.title,
    date: event.start ?? start,
    href: event.href ?? "/calendar",
  }));
}

export async function getDashboardYearNumbers() {
  const range = yearRange();
  const [gamesFinished, booksDone, moviesDone, tvDone, posts] = await Promise.all([
    db.activity.count({
      where: {
        module: "games",
        action: "finished",
        happenedAt: { gte: range.start, lt: range.end },
      },
    }),
    db.mediaItem.count({
      where: {
        type: "BOOK",
        status: "DONE",
        finishedAt: { gte: range.start, lt: range.end },
      },
    }),
    db.mediaItem.count({
      where: {
        type: { in: ["MOVIE", "TV"] },
        status: "DONE",
        finishedAt: { gte: range.start, lt: range.end },
      },
    }),
    db.mediaItem.count({
      where: {
        type: "TV",
        status: "DONE",
        finishedAt: { gte: range.start, lt: range.end },
      },
    }),
    db.post.count({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: { gte: range.start, lt: range.end },
      },
    }),
  ]);

  return {
    year: range.year,
    gamesFinished,
    booksDone,
    moviesDone: moviesDone - tvDone,
    tvDone,
    posts,
  };
}

export async function getDashboardActivity() {
  return getRecentActivityGroups(20);
}
