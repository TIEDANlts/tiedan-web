import { Prisma } from "@prisma/client";

import { toShanghaiTime } from "../../lib/dayjs";
import { normalizeMoneyAmount } from "../../lib/money";
import { categorizeExpenseTransaction } from "./categorize";
import { getExpenseCategoriesForCategorize } from "./category-options";

export const QUICK_EXPENSE_LIMIT = 10;
export const QUICK_EXPENSE_WINDOW_MS = 60_000;

export type ParsedQuickExpense =
  | { ok: true; data: { amount: string; merchant: string; note: string } }
  | { ok: false; error: string };

export function parseQuickExpenseText(text: unknown): ParsedQuickExpense {
  if (typeof text !== "string") {
    return { ok: false, error: "text 必须是字符串。" };
  }

  const normalized = text.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(.+?)\s+(\d+(?:\.\d{1,2})?)$/);
  if (!match) {
    return { ok: false, error: "请用“商户 金额”的格式，比如“咖啡 35”。" };
  }

  const [, merchant, amount] = match;
  const money = normalizeMoneyAmount(amount);
  if (!money.ok) {
    return { ok: false, error: money.error };
  }

  return {
    ok: true,
    data: {
      amount,
      merchant: merchant.trim(),
      note: merchant.trim(),
    },
  };
}

type Bucket = {
  resetAt: number;
  count: number;
};

export class QuickExpenseRateLimiter {
  private buckets = new Map<string, Bucket>();

  consume(token: string, now = Date.now()) {
    const current = this.buckets.get(token);
    if (!current || current.resetAt <= now) {
      this.buckets.set(token, { count: 1, resetAt: now + QUICK_EXPENSE_WINDOW_MS });
      return { ok: true as const };
    }

    if (current.count >= QUICK_EXPENSE_LIMIT) {
      return {
        ok: false as const,
        retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
      };
    }

    current.count += 1;
    return { ok: true as const };
  }
}

export const quickExpenseRateLimiter = new QuickExpenseRateLimiter();

export async function buildQuickExpenseCreateData(parsed: Extract<ParsedQuickExpense, { ok: true }>["data"]) {
  const amount = new Prisma.Decimal(parsed.amount);
  const categories = await getExpenseCategoriesForCategorize();
  const categoryId = categorizeExpenseTransaction(
    {
      direction: "EXPENSE",
      merchant: parsed.merchant,
      item: parsed.note,
      sourceCategory: null,
    },
    categories,
  );

  return {
    platform: "quick",
    txnNo: null,
    amount,
    direction: "EXPENSE" as const,
    categoryId,
    txnTime: toShanghaiTime().toDate(),
    merchant: parsed.merchant,
    item: null,
    payMethod: null,
    note: parsed.note,
  };
}
