import { Prisma } from "@prisma/client";

import { SHANGHAI_TIMEZONE, toShanghaiTime, dayjs } from "../../lib/dayjs";
import { normalizeMoneyAmount, sumMoney } from "../../lib/money";

export const expenseDirections = ["EXPENSE", "INCOME", "NEUTRAL"] as const;
export const manualDirections = ["EXPENSE", "INCOME"] as const;
export const expenseDirectionLabels = {
  ALL: "全部方向",
  EXPENSE: "支出",
  INCOME: "收入",
  NEUTRAL: "不计收支",
} as const satisfies Record<"ALL" | TxnDirectionValue, string>;

export type TxnDirectionValue = (typeof expenseDirections)[number];
export type ManualDirectionValue = (typeof manualDirections)[number];
export type DirectionFilter = "ALL" | TxnDirectionValue;

export type ExpenseFilters = {
  month: string;
  date: string;
  direction: DirectionFilter;
  categoryId: string;
  platform: string;
  query: string;
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  direction: ManualDirectionValue;
};

export type ManualTransactionInput = {
  amount: unknown;
  direction: unknown;
  categoryId: unknown;
  date: unknown;
  merchant: unknown;
  note: unknown;
};

export type NormalizedManualTransactionInput =
  | {
      ok: true;
      data: {
        platform: "manual";
        txnNo: null;
        amount: Prisma.Decimal;
        direction: ManualDirectionValue;
        categoryId: string | null;
        txnTime: Date;
        merchant: string | null;
        item: null;
        payMethod: null;
        note: string | null;
      };
    }
  | {
      ok: false;
      errors: Partial<Record<"amount" | "direction" | "categoryId" | "date", string>>;
    };

export type ExpenseCategoryFormDataResult =
  | {
      ok: true;
      data: {
        name: string;
        direction: ManualDirectionValue;
        icon: string | null;
        keywords: string[];
      };
    }
  | {
      ok: false;
      errors: Partial<Record<"name" | "direction" | "icon" | "keywords", string>>;
    };

export type TransactionForGrouping = {
  id: string;
  txnDate: string;
  amount: string;
  direction: TxnDirectionValue;
};

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function defaultExpenseFilters(month = toShanghaiTime().format("YYYY-MM")): ExpenseFilters {
  return {
    month,
    date: "",
    direction: "ALL",
    categoryId: "",
    platform: "",
    query: "",
  };
}

export function isTxnDirection(value: string): value is TxnDirectionValue {
  return expenseDirections.includes(value as TxnDirectionValue);
}

export function isManualDirection(value: string): value is ManualDirectionValue {
  return manualDirections.includes(value as ManualDirectionValue);
}

export function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = dayjs.tz(`${value}-01T00:00:00`, SHANGHAI_TIMEZONE);
  return parsed.isValid() && parsed.format("YYYY-MM") === value;
}

export function parseExpenseFilters(
  params: Record<string, string | string[] | undefined>,
  now: Date = new Date(),
): ExpenseFilters {
  const fallbackMonth = toShanghaiTime(now).format("YYYY-MM");
  const month = firstParamValue(params.month)?.trim() ?? "";
  const date = firstParamValue(params.date)?.trim() ?? "";
  const direction = firstParamValue(params.direction)?.trim() ?? "";
  const parsedDate = parseDate(date);

  return {
    month: isValidMonth(month) ? month : fallbackMonth,
    date: parsedDate ? date : "",
    direction: isTxnDirection(direction) ? direction : "ALL",
    categoryId: firstParamValue(params.category)?.trim() ?? "",
    platform: firstParamValue(params.platform)?.trim() ?? "",
    query: firstParamValue(params.q)?.trim() ?? "",
  };
}

export function monthRange(month: string) {
  const start = dayjs.tz(`${month}-01T00:00:00`, SHANGHAI_TIMEZONE);

  return {
    start: start.toDate(),
    end: start.add(1, "month").toDate(),
  };
}

export function dayRange(date: string) {
  const start = dayjs.tz(`${date}T00:00:00`, SHANGHAI_TIMEZONE);

  return {
    start: start.toDate(),
    end: start.add(1, "day").toDate(),
  };
}

export function shiftMonth(month: string, offset: number) {
  return dayjs.tz(`${month}-01T00:00:00`, SHANGHAI_TIMEZONE).add(offset, "month").format("YYYY-MM");
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = dayjs.tz(`${value}T00:00:00`, SHANGHAI_TIMEZONE);
  if (!parsed.isValid() || parsed.format("YYYY-MM-DD") !== value) {
    return null;
  }

  return parsed.toDate();
}

export function normalizeManualTransactionInput(
  input: ManualTransactionInput,
  categories: ExpenseCategoryOption[],
): NormalizedManualTransactionInput {
  const amount = normalizeMoneyAmount(input.amount);
  const direction = stringValue(input.direction);
  const categoryId = stringValue(input.categoryId);
  const date = stringValue(input.date);
  const merchant = stringValue(input.merchant);
  const note = stringValue(input.note);
  const errors: Extract<NormalizedManualTransactionInput, { ok: false }>["errors"] = {};

  if (!amount.ok) {
    errors.amount = amount.error;
  }

  if (!isManualDirection(direction)) {
    errors.direction = "请选择支出或收入。";
  }

  const txnTime = parseDate(date);
  if (!txnTime) {
    errors.date = "日期格式不正确。";
  }

  const category = categoryId ? categories.find((item) => item.id === categoryId) : null;
  if (categoryId && (!category || category.direction !== direction)) {
    errors.categoryId = "请选择当前方向下的分类。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      platform: "manual",
      txnNo: null,
      amount: amount.ok ? amount.value : new Prisma.Decimal(0),
      direction: direction as ManualDirectionValue,
      categoryId: category?.id ?? null,
      txnTime: txnTime ?? new Date(),
      merchant: merchant || null,
      item: null,
      payMethod: null,
      note: note || null,
    },
  };
}

function readKeywords(formData: FormData) {
  return Array.from(
    new Set(
      stringValue(formData.get("keywords"))
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

export function readManualTransactionFormData(formData: FormData, categories: ExpenseCategoryOption[]) {
  return normalizeManualTransactionInput(
    {
      amount: formData.get("amount"),
      direction: formData.get("direction"),
      categoryId: formData.get("categoryId"),
      date: formData.get("date"),
      merchant: formData.get("merchant"),
      note: formData.get("note"),
    },
    categories,
  );
}

export function readExpenseCategoryFormData(formData: FormData): ExpenseCategoryFormDataResult {
  const name = stringValue(formData.get("name"));
  const direction = stringValue(formData.get("direction"));
  const icon = stringValue(formData.get("icon"));
  const keywords = readKeywords(formData);
  const errors: Extract<ExpenseCategoryFormDataResult, { ok: false }>["errors"] = {};

  if (!name) {
    errors.name = "分类名称不能为空。";
  }

  if (!isManualDirection(direction)) {
    errors.direction = "请选择支出或收入。";
  }

  if (icon.length > 8) {
    errors.icon = "图标请控制在 8 个字符以内。";
  }

  if (keywords.length === 0) {
    errors.keywords = "至少保留一个关键词。";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      direction: direction as ManualDirectionValue,
      icon: icon || null,
      keywords,
    },
  };
}

export function groupTransactionsByDate<T extends TransactionForGrouping>(items: T[]) {
  const groups = new Map<string, { date: string; expenseSubtotal: string; items: T[] }>();

  for (const item of items) {
    const group = groups.get(item.txnDate) ?? { date: item.txnDate, expenseSubtotal: "0.00", items: [] };
    group.items.push(item);
    if (item.direction === "EXPENSE") {
      group.expenseSubtotal = sumMoney([group.expenseSubtotal, item.amount]).toFixed(2);
    }
    groups.set(item.txnDate, group);
  }

  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function buildCompleteSortUpdates(currentIds: string[], orderedIds: string[], step = 10) {
  const currentIdSet = new Set(currentIds);
  const orderedIdSet = new Set(orderedIds);

  if (
    orderedIdSet.size !== orderedIds.length ||
    orderedIdSet.size !== currentIdSet.size ||
    orderedIds.some((id) => !currentIdSet.has(id))
  ) {
    return null;
  }

  return orderedIds.map((id, index) => ({
    id,
    sort: (index + 1) * step,
  }));
}

export function transactionDisplayText(item: string | null, note: string | null) {
  return item || note || "手动记账";
}
