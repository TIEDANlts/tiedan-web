import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildMonthCategoryDetails,
  buildYearTrend,
  parseExpenseStatsParams,
  summarizeExpenseStatsRows,
  weekdayAverageFromRows,
} from "./stats";

describe("parseExpenseStatsParams", () => {
  it("keeps valid periods and falls back from invalid values", () => {
    const now = new Date("2026-06-15T03:00:00.000Z");

    expect(parseExpenseStatsParams({ view: "month", month: "2026-05" }, now)).toMatchObject({
      view: "month",
      month: "2026-05",
    });
    expect(parseExpenseStatsParams({ view: "week", week: "2026-W24" }, now)).toMatchObject({
      view: "week",
      week: "2026-W24",
    });
    expect(parseExpenseStatsParams({ view: "year", year: "2025" }, now)).toMatchObject({
      view: "year",
      year: "2025",
    });
    expect(parseExpenseStatsParams({ view: "bad", month: "2026-99", week: "2026-W99", year: "x" }, now)).toMatchObject({
      view: "month",
      month: "2026-06",
      year: "2026",
    });
  });

  it("uses the ISO week-year around calendar year boundaries", () => {
    expect(parseExpenseStatsParams({ view: "week" }, new Date("2024-12-30T04:00:00.000Z"))).toMatchObject({
      view: "week",
      week: "2025-W01",
      prevWeek: "2024-W52",
      nextWeek: "2025-W02",
    });

    expect(parseExpenseStatsParams({ view: "week", week: "2025-W01" }).week).toBe("2025-W01");
  });
});

describe("expense stats calculations", () => {
  it("summarizes income and expense while excluding neutral rows", () => {
    const summary = summarizeExpenseStatsRows([
      { direction: "EXPENSE", amount: new Prisma.Decimal("0.10") },
      { direction: "EXPENSE", amount: new Prisma.Decimal("0.20") },
      { direction: "INCOME", amount: new Prisma.Decimal("10.00") },
      { direction: "NEUTRAL", amount: new Prisma.Decimal("99.00") },
    ]);

    expect(summary.expense).toBe("0.30");
    expect(summary.income).toBe("10.00");
    expect(summary.balance).toBe("9.70");
  });

  it("shows category month-over-month as dashes when previous month has no data", () => {
    const details = buildMonthCategoryDetails(
      [
        { categoryId: "food", name: "餐饮", icon: "🍜", amount: new Prisma.Decimal("20.00"), count: 2 },
        { categoryId: null, name: "未分类", icon: null, amount: new Prisma.Decimal("5.00"), count: 1 },
      ],
      [],
    );

    expect(details[0]).toMatchObject({
      categoryId: "food",
      amount: "20.00",
      count: 2,
      sharePercent: "80.00",
      momPercent: null,
      momText: "--",
    });
    expect(details[1].sharePercent).toBe("20.00");
  });

  it("returns a complete 12-month year trend with empty months set to zero", () => {
    const trend = buildYearTrend("2026", [
      { month: "2026-01", direction: "EXPENSE", amount: new Prisma.Decimal("12.30") },
      { month: "2026-01", direction: "INCOME", amount: new Prisma.Decimal("100.00") },
      { month: "2026-03", direction: "EXPENSE", amount: new Prisma.Decimal("1.00") },
    ]);

    expect(trend).toHaveLength(12);
    expect(trend[0]).toMatchObject({ month: "2026-01", expense: "12.30", income: "100.00" });
    expect(trend[1]).toMatchObject({ month: "2026-02", expense: "0.00", income: "0.00" });
    expect(trend[2]).toMatchObject({ month: "2026-03", expense: "1.00", income: "0.00" });
  });

  it("averages weekday spending across the selected eight-week window", () => {
    const averages = weekdayAverageFromRows([
      { isoDow: 1, amount: new Prisma.Decimal("80.00") },
      { isoDow: 1, amount: new Prisma.Decimal("0.00") },
      { isoDow: 7, amount: new Prisma.Decimal("16.00") },
    ]);

    expect(averages).toHaveLength(7);
    expect(averages[0]).toMatchObject({ isoDow: 1, label: "周一", amount: "10.00" });
    expect(averages[6]).toMatchObject({ isoDow: 7, label: "周日", amount: "2.00" });
  });
});
