import { describe, expect, it } from "vitest";

import { QuickExpenseRateLimiter, parseQuickExpenseText } from "./quick";

describe("parseQuickExpenseText", () => {
  it("parses the final number as amount and keeps the leading text as merchant and note", () => {
    expect(parseQuickExpenseText("咖啡 35")).toEqual({
      ok: true,
      data: { amount: "35", merchant: "咖啡", note: "咖啡" },
    });
    expect(parseQuickExpenseText("星巴克 拿铁 35.50")).toEqual({
      ok: true,
      data: { amount: "35.50", merchant: "星巴克 拿铁", note: "星巴克 拿铁" },
    });
  });

  it("rejects missing, negative, and over-precision amounts", () => {
    expect(parseQuickExpenseText("咖啡")).toMatchObject({ ok: false });
    expect(parseQuickExpenseText("咖啡 -1")).toMatchObject({ ok: false });
    expect(parseQuickExpenseText("咖啡 1.234")).toMatchObject({ ok: false });
  });
});

describe("QuickExpenseRateLimiter", () => {
  it("allows ten requests per minute per token and rejects the eleventh", () => {
    const limiter = new QuickExpenseRateLimiter();
    const now = new Date("2026-06-15T12:00:00.000Z").getTime();

    for (let index = 0; index < 10; index += 1) {
      expect(limiter.consume("token-a", now + index)).toEqual({ ok: true });
    }

    expect(limiter.consume("token-a", now + 30_000)).toMatchObject({ ok: false, retryAfterSeconds: 30 });
    expect(limiter.consume("token-b", now + 30_000)).toEqual({ ok: true });
    expect(limiter.consume("token-a", now + 61_000)).toEqual({ ok: true });
  });
});
