import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { formatMoney, normalizeMoneyAmount, sumMoney } from "./money";

describe("formatMoney", () => {
  it("formats decimal strings with yuan prefix and thousands separators", () => {
    expect(formatMoney("1234.5")).toBe("¥1,234.50");
    expect(formatMoney(new Prisma.Decimal("1000000"))).toBe("¥1,000,000.00");
    expect(formatMoney("0.01")).toBe("¥0.01");
  });
});

describe("sumMoney", () => {
  it("adds decimal amounts without floating point drift", () => {
    expect(sumMoney(["0.10", "0.20"]).toFixed(2)).toBe("0.30");
  });
});

describe("normalizeMoneyAmount", () => {
  it("accepts positive amounts with at most two decimal places", () => {
    const result = normalizeMoneyAmount(" 12.3 ");

    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.value.toFixed(2)).toBe("12.30");
  });

  it("rejects zero, negative, and over-precise amounts", () => {
    expect(normalizeMoneyAmount("0")).toEqual({ ok: false, error: "金额必须大于 0。" });
    expect(normalizeMoneyAmount("-1")).toEqual({ ok: false, error: "金额必须是最多两位小数的正数。" });
    expect(normalizeMoneyAmount("1.234")).toEqual({ ok: false, error: "金额必须是最多两位小数的正数。" });
  });

  it("rejects values beyond Decimal(12,2)", () => {
    expect(normalizeMoneyAmount("9999999999.99")).toMatchObject({ ok: true });
    expect(normalizeMoneyAmount("10000000000.00")).toEqual({
      ok: false,
      error: "金额不能超过 9,999,999,999.99。",
    });
  });
});
