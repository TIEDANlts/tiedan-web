import { Prisma } from "@prisma/client";

import { dayjs, formatShanghaiDate, SHANGHAI_TIMEZONE, toShanghaiTime } from "../../lib/dayjs";
import { formatMoney, sumMoney } from "../../lib/money";
import { monthRange, shiftMonth } from "./utils";

export type ExpenseStatsView = "month" | "week" | "year";
export type ExpenseStatsSearchParams = Record<string, string | string[] | undefined>;

const weekdayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value: Prisma.Decimal.Value = 0) {
  return new Prisma.Decimal(value);
}

function fixed(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function percent(value: Prisma.Decimal) {
  return `${value.toFixed(2)}%`;
}

function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = dayjs.tz(`${value}-01T00:00:00`, SHANGHAI_TIMEZONE);
  return parsed.isValid() && parsed.format("YYYY-MM") === value;
}

function isValidYear(value: string) {
  return /^\d{4}$/.test(value);
}

function isValidWeek(value: string) {
  if (!/^\d{4}-W\d{2}$/.test(value)) {
    return false;
  }
  const start = weekStart(value);
  return start.isValid() && toWeekValue(start) === value;
}

function toWeekValue(input: Date | ReturnType<typeof dayjs>) {
  const date = "format" in input ? input : toShanghaiTime(input);
  return `${date.format("YYYY")}-W${date.isoWeek().toString().padStart(2, "0")}`;
}

function weekStart(week: string) {
  const [year, rawWeek] = week.split("-W");
  return dayjs.tz(`${year}-01-04T00:00:00`, SHANGHAI_TIMEZONE).isoWeek(Number(rawWeek)).startOf("isoWeek");
}

export function parseExpenseStatsParams(params: ExpenseStatsSearchParams, now: Date = new Date()) {
  const current = toShanghaiTime(now);
  const viewParam = firstParamValue(params.view);
  const view: ExpenseStatsView = viewParam === "week" || viewParam === "year" ? viewParam : "month";
  const rawMonth = firstParamValue(params.month)?.trim() ?? "";
  const rawWeek = firstParamValue(params.week)?.trim() ?? "";
  const rawYear = firstParamValue(params.year)?.trim() ?? "";
  const month = isValidMonth(rawMonth) ? rawMonth : current.format("YYYY-MM");
  const week = isValidWeek(rawWeek) ? rawWeek : toWeekValue(current);
  const year = isValidYear(rawYear) ? rawYear : current.format("YYYY");

  return {
    view,
    month,
    week,
    year,
    prevMonth: shiftMonth(month, -1),
    nextMonth: shiftMonth(month, 1),
    prevWeek: toWeekValue(weekStart(week).subtract(1, "week")),
    nextWeek: toWeekValue(weekStart(week).add(1, "week")),
    prevYear: String(Number(year) - 1),
    nextYear: String(Number(year) + 1),
  };
}

export function summarizeExpenseStatsRows(rows: Array<{ direction: string; amount: Prisma.Decimal }>) {
  const expense = sumMoney(rows.filter((row) => row.direction === "EXPENSE").map((row) => row.amount));
  const income = sumMoney(rows.filter((row) => row.direction === "INCOME").map((row) => row.amount));
  const balance = income.minus(expense);

  return {
    expense: fixed(expense),
    income: fixed(income),
    balance: fixed(balance),
    expenseText: formatMoney(expense),
    incomeText: formatMoney(income),
    balanceText: formatMoney(balance),
  };
}

function comparePercent(current: Prisma.Decimal, previous: Prisma.Decimal) {
  if (previous.eq(0)) {
    return { value: null, text: "--", trend: "flat" as const };
  }

  const value = current.minus(previous).div(previous).mul(100);
  return {
    value: value.toFixed(2),
    text: percent(value),
    trend: value.gt(0) ? ("up" as const) : value.lt(0) ? ("down" as const) : ("flat" as const),
  };
}

export function buildMonthCategoryDetails(
  currentRows: Array<{ categoryId: string | null; name: string; icon: string | null; amount: Prisma.Decimal; count: number }>,
  previousRows: Array<{ categoryId: string | null; amount: Prisma.Decimal }>,
) {
  const total = sumMoney(currentRows.map((row) => row.amount));
  const previousByCategory = new Map(previousRows.map((row) => [row.categoryId ?? "__uncategorized", row.amount]));

  return currentRows
    .map((row) => {
      const previous = previousByCategory.get(row.categoryId ?? "__uncategorized") ?? money(0);
      const mom = comparePercent(row.amount, previous);
      const share = total.eq(0) ? money(0) : row.amount.div(total).mul(100);

      return {
        categoryId: row.categoryId,
        name: row.name,
        icon: row.icon,
        amount: fixed(row.amount),
        amountText: formatMoney(row.amount),
        count: row.count,
        sharePercent: share.toFixed(2),
        shareText: percent(share),
        momPercent: mom.value,
        momText: mom.text,
        momTrend: mom.trend,
      };
    })
    .sort((a, b) => Number(b.amount) - Number(a.amount));
}

export function buildYearTrend(year: string, rows: Array<{ month: string; direction: string; amount: Prisma.Decimal }>) {
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const map = new Map(months.map((month) => [month, { month, expense: money(0), income: money(0) }]));

  for (const row of rows) {
    const item = map.get(row.month);
    if (!item) {
      continue;
    }
    if (row.direction === "EXPENSE") {
      item.expense = item.expense.plus(row.amount);
    }
    if (row.direction === "INCOME") {
      item.income = item.income.plus(row.amount);
    }
  }

  return months.map((month) => {
    const item = map.get(month)!;
    return {
      month,
      expense: fixed(item.expense),
      income: fixed(item.income),
      expenseText: formatMoney(item.expense),
      incomeText: formatMoney(item.income),
    };
  });
}

export function weekdayAverageFromRows(rows: Array<{ isoDow: number; amount: Prisma.Decimal }>) {
  const totals = new Map<number, Prisma.Decimal>();
  for (let isoDow = 1; isoDow <= 7; isoDow += 1) {
    totals.set(isoDow, money(0));
  }
  for (const row of rows) {
    totals.set(row.isoDow, (totals.get(row.isoDow) ?? money(0)).plus(row.amount));
  }

  return Array.from({ length: 7 }, (_, index) => {
    const isoDow = index + 1;
    const amount = (totals.get(isoDow) ?? money(0)).div(8);
    return {
      isoDow,
      label: weekdayLabels[index],
      amount: fixed(amount),
      amountText: formatMoney(amount),
    };
  });
}

function dateRange(start: Date, end: Date) {
  const dates: string[] = [];
  let cursor = toShanghaiTime(start);
  const last = toShanghaiTime(end);
  while (cursor.isBefore(last)) {
    dates.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }
  return dates;
}

async function groupedTotals(start: Date, end: Date) {
  const { db } = await import("@/lib/db");
  const rows = await db.transaction.groupBy({
    by: ["direction"],
    where: { txnTime: { gte: start, lt: end }, direction: { not: "NEUTRAL" } },
    _sum: { amount: true },
  });

  return summarizeExpenseStatsRows(rows.map((row) => ({ direction: row.direction, amount: row._sum.amount ?? money(0) })));
}

async function categoryRows(start: Date, end: Date) {
  const { db } = await import("@/lib/db");
  const rows = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { txnTime: { gte: start, lt: end }, direction: "EXPENSE" },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  const categories = await db.expenseCategory.findMany({
    where: { id: { in: rows.flatMap((row) => (row.categoryId ? [row.categoryId] : [])) } },
    select: { id: true, name: true, icon: true },
  });
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return rows.map((row) => {
    const category = row.categoryId ? categoryMap.get(row.categoryId) : null;
    return {
      categoryId: row.categoryId,
      name: category?.name ?? "未分类",
      icon: category?.icon ?? null,
      amount: row._sum.amount ?? money(0),
      count: row._count._all,
    };
  });
}

async function dailyExpenseRows(start: Date, end: Date) {
  const { db } = await import("@/lib/db");
  const rows = await db.$queryRaw<Array<{ day: Date; amount: Prisma.Decimal }>>`
    SELECT date_trunc('day', "txnTime" AT TIME ZONE 'Asia/Shanghai') AS day, COALESCE(SUM(amount), 0) AS amount
    FROM "Transaction"
    WHERE "txnTime" >= ${start} AND "txnTime" < ${end} AND direction = 'EXPENSE'
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const map = new Map(rows.map((row) => [formatShanghaiDate(row.day), row.amount]));

  return dateRange(start, end).map((date) => {
    const amount = map.get(date) ?? money(0);
    return { date, amount: fixed(amount), amountText: formatMoney(amount) };
  });
}

async function topMerchantRows(start: Date, end: Date) {
  const { db } = await import("@/lib/db");
  const rows = await db.transaction.groupBy({
    by: ["merchant"],
    where: { txnTime: { gte: start, lt: end }, direction: "EXPENSE" },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  return rows.map((row) => {
    const amount = row._sum.amount ?? money(0);
    return {
      merchant: row.merchant || "未填写商户",
      amount: fixed(amount),
      amountText: formatMoney(amount),
      count: row._count._all,
    };
  });
}

export async function getExpenseMonthStats(month: string) {
  const range = monthRange(month);
  const previousRange = monthRange(shiftMonth(month, -1));
  const [summary, previousSummary, currentCategories, previousCategories, dailyExpenses, topMerchants] = await Promise.all([
    groupedTotals(range.start, range.end),
    groupedTotals(previousRange.start, previousRange.end),
    categoryRows(range.start, range.end),
    categoryRows(previousRange.start, previousRange.end),
    dailyExpenseRows(range.start, range.end),
    topMerchantRows(range.start, range.end),
  ]);
  const mom = comparePercent(new Prisma.Decimal(summary.expense), new Prisma.Decimal(previousSummary.expense));
  const categoryDetails = buildMonthCategoryDetails(currentCategories, previousCategories);

  return {
    month,
    summary: {
      ...summary,
      expenseMomPercent: mom.value,
      expenseMomText: mom.text,
      expenseMomTrend: mom.trend,
    },
    categoryDetails,
    dailyExpenses,
    topMerchants,
    hasData:
      !new Prisma.Decimal(summary.expense).eq(0) ||
      !new Prisma.Decimal(summary.income).eq(0) ||
      categoryDetails.length > 0 ||
      topMerchants.length > 0,
  };
}

async function weekExpenseRows(week: string) {
  const start = weekStart(week);
  return dailyExpenseRows(start.toDate(), start.add(1, "week").toDate());
}

export async function getExpenseWeekStats(week: string) {
  const { db } = await import("@/lib/db");
  const start = weekStart(week);
  const averageStart = start.subtract(7, "week");
  const rows = await db.$queryRaw<Array<{ isoDow: number; amount: Prisma.Decimal }>>`
    SELECT EXTRACT(ISODOW FROM ("txnTime" AT TIME ZONE 'Asia/Shanghai'))::int AS "isoDow",
           COALESCE(SUM(amount), 0) AS amount
    FROM "Transaction"
    WHERE "txnTime" >= ${averageStart.toDate()} AND "txnTime" < ${start.add(1, "week").toDate()} AND direction = 'EXPENSE'
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const [currentWeek, previousWeek] = await Promise.all([weekExpenseRows(week), weekExpenseRows(toWeekValue(start.subtract(1, "week")))]);

  return {
    week,
    startDate: start.format("YYYY-MM-DD"),
    endDate: start.add(6, "day").format("YYYY-MM-DD"),
    currentWeek,
    previousWeek,
    weekdayAverages: weekdayAverageFromRows(rows),
    hasData: currentWeek.some((item) => item.amount !== "0.00") || previousWeek.some((item) => item.amount !== "0.00"),
  };
}

export async function getExpenseYearStats(year: string) {
  const { db } = await import("@/lib/db");
  const start = dayjs.tz(`${year}-01-01T00:00:00`, SHANGHAI_TIMEZONE);
  const end = start.add(1, "year");
  const rows = await db.$queryRaw<Array<{ month: string; direction: string; amount: Prisma.Decimal }>>`
    SELECT to_char(date_trunc('month', "txnTime" AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM') AS month,
           direction::text AS direction,
           COALESCE(SUM(amount), 0) AS amount
    FROM "Transaction"
    WHERE "txnTime" >= ${start.toDate()} AND "txnTime" < ${end.toDate()} AND direction <> 'NEUTRAL'
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `;
  const [summary, categories] = await Promise.all([groupedTotals(start.toDate(), end.toDate()), categoryRows(start.toDate(), end.toDate())]);
  const categoryDetails = buildMonthCategoryDetails(categories, []);

  return {
    year,
    summary,
    trend: buildYearTrend(year, rows),
    categoryDetails,
    hasData: !new Prisma.Decimal(summary.expense).eq(0) || !new Prisma.Decimal(summary.income).eq(0),
  };
}
