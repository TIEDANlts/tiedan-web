import { Prisma } from "@prisma/client";

export type MoneyInput = string | Prisma.Decimal;

export type NormalizedMoneyAmount =
  | { ok: true; value: Prisma.Decimal }
  | { ok: false; error: string };

export const MAX_DECIMAL_12_2 = new Prisma.Decimal("9999999999.99");
export const MAX_DECIMAL_12_2_TEXT = "9,999,999,999.99";

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function fixedMoney(value: MoneyInput) {
  return (typeof value === "string" ? new Prisma.Decimal(value) : value).toFixed(2);
}

function addThousands(integerPart: string) {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatMoney(value: MoneyInput) {
  const fixed = fixedMoney(value);
  const negative = fixed.startsWith("-");
  const [integerPart, decimalPart = "00"] = (negative ? fixed.slice(1) : fixed).split(".");

  return `${negative ? "-" : ""}¥${addThousands(integerPart)}.${decimalPart.padEnd(2, "0").slice(0, 2)}`;
}

export function sumMoney(values: MoneyInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (sum, value) => sum.plus(typeof value === "string" ? value : value.toString()),
    new Prisma.Decimal(0),
  );
}

export function normalizeMoneyAmount(rawAmount: unknown): NormalizedMoneyAmount {
  const amount = stringValue(rawAmount);

  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return { ok: false, error: "金额必须是最多两位小数的正数。" };
  }

  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) {
    return { ok: false, error: "金额必须大于 0。" };
  }

  if (value.gt(MAX_DECIMAL_12_2)) {
    return { ok: false, error: `金额不能超过 ${MAX_DECIMAL_12_2_TEXT}。` };
  }

  return { ok: true, value };
}
