import { describe, expect, it } from "vitest";

import { formatShanghaiDate } from "../../lib/dayjs";
import {
  defaultExpenseFilters,
  expenseDirections,
  groupTransactionsByDate,
  monthRange,
  normalizeManualTransactionInput,
  parseExpenseFilters,
} from "./utils";

const categories = [
  { id: "food", name: "餐饮", direction: "EXPENSE" as const },
  { id: "salary", name: "工资", direction: "INCOME" as const },
];

describe("parseExpenseFilters", () => {
  it("keeps valid filter values and falls back from invalid values", () => {
    expect(
      parseExpenseFilters(
        {
          month: "2026-06",
          direction: "EXPENSE",
          category: "food",
          platform: "manual",
          q: " coffee ",
        },
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toEqual({
      month: "2026-06",
      direction: "EXPENSE",
      categoryId: "food",
      platform: "manual",
      query: "coffee",
    });

    expect(
      parseExpenseFilters({ month: "2026-13", direction: "BAD" }, new Date("2026-06-15T00:00:00.000Z")),
    ).toEqual(defaultExpenseFilters("2026-06"));
  });
});

describe("monthRange", () => {
  it("uses Shanghai month boundaries", () => {
    const range = monthRange("2026-06");

    expect(formatShanghaiDate(range.start)).toBe("2026-06-01");
    expect(formatShanghaiDate(new Date(range.end.getTime() - 1))).toBe("2026-06-30");
  });
});

describe("normalizeManualTransactionInput", () => {
  it("normalizes manual transaction input to Decimal and Shanghai date", () => {
    const result = normalizeManualTransactionInput(
      {
        amount: "0.1",
        direction: "EXPENSE",
        categoryId: "food",
        date: "2026-06-15",
        merchant: " 咖啡店 ",
        note: " 早餐 ",
      },
      categories,
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        platform: "manual",
        txnNo: null,
        direction: "EXPENSE",
        categoryId: "food",
        merchant: "咖啡店",
        note: "早餐",
      },
    });
    expect(result.ok && result.data.amount.toFixed(2)).toBe("0.10");
    expect(result.ok && formatShanghaiDate(result.data.txnTime)).toBe("2026-06-15");
  });

  it("rejects categories that do not match the selected direction", () => {
    expect(
      normalizeManualTransactionInput(
        {
          amount: "10",
          direction: "EXPENSE",
          categoryId: "salary",
          date: "2026-06-15",
          merchant: "",
          note: "",
        },
        categories,
      ),
    ).toEqual({
      ok: false,
      errors: {
        categoryId: "请选择当前方向下的分类。",
      },
    });
  });
});

describe("groupTransactionsByDate", () => {
  it("groups transactions by date and excludes income and neutral from daily expense subtotal", () => {
    const groups = groupTransactionsByDate([
      { id: "1", txnDate: "2026-06-15", amount: "0.10", direction: "EXPENSE" },
      { id: "2", txnDate: "2026-06-15", amount: "0.20", direction: "EXPENSE" },
      { id: "3", txnDate: "2026-06-15", amount: "100.00", direction: "INCOME" },
      { id: "4", txnDate: "2026-06-15", amount: "9.00", direction: "NEUTRAL" },
      { id: "5", txnDate: "2026-06-14", amount: "1.00", direction: "EXPENSE" },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe("2026-06-15");
    expect(groups[0].expenseSubtotal).toBe("0.30");
    expect(groups[1].expenseSubtotal).toBe("1.00");
    expect(expenseDirections).toEqual(["EXPENSE", "INCOME", "NEUTRAL"]);
  });
});
