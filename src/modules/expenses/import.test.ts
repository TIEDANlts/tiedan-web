import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { categorizeExpenseTransaction } from "./categorize";
import { buildExpenseImportPreview, normalizeImportRowsForCreate } from "./import-executor";
import { detectExpenseImportPlatform, parseExpenseImportFile } from "./parsers";

const fixturePath = (...parts: string[]) => join(process.cwd(), "tests", "fixtures", ...parts);

describe("expense bill parsers", () => {
  it("decodes Alipay GBK CSV, locates the transaction header, and normalizes rows", () => {
    const buffer = readFileSync(fixturePath("alipay-sample.csv"));
    const result = parseExpenseImportFile(buffer, "alipay");

    expect(result.platform).toBe("alipay");
    expect(result.encoding).toBe("gbk");
    expect(result.rows).toHaveLength(3);
    expect(result.filteredRows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      txnTime: "2026-06-01 08:12:03",
      sourceCategory: "餐饮美食",
      merchant: "上海咖啡店",
      item: "拿铁",
      direction: "EXPENSE",
      amount: "18.50",
      payMethod: "余额宝",
      txnNo: "ALI-EXP-001",
    });
    expect(result.rows[0].raw).toMatchObject({
      交易时间: "2026-06-01 08:12:03",
      交易对方: "上海咖啡店",
    });
    expect(result.rows.map((row) => row.direction)).toEqual(["EXPENSE", "INCOME", "NEUTRAL"]);
    expect(result.filteredRows.map((row) => row.reason)).toEqual(["交易关闭", "已全额退款"]);
    expect(result.errors[0].message).toContain("交易时间");
  });

  it("decodes WeChat UTF-8 CSV, strips yuan prefix, and collects bad rows", () => {
    const buffer = readFileSync(fixturePath("wechat-sample.csv"));
    const result = parseExpenseImportFile(buffer, "wechat");

    expect(result.platform).toBe("wechat");
    expect(result.encoding).toBe("utf8");
    expect(result.rows).toHaveLength(3);
    expect(result.filteredRows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      txnTime: "2026-06-02 08:30:00",
      sourceCategory: "餐饮",
      merchant: "便利店",
      item: "早餐",
      direction: "EXPENSE",
      amount: "12.30",
      payMethod: "零钱",
      txnNo: "WX-EXP-001",
    });
    expect(result.rows.map((row) => row.amount)).toEqual(["12.30", "88.00", "0.08"]);
    expect(result.rows.map((row) => row.direction)).toEqual(["EXPENSE", "INCOME", "NEUTRAL"]);
    expect(result.filteredRows.map((row) => row.txnNo)).toEqual(["WX-CLOSED-001", "WX-REFUND-001"]);
    expect(result.errors[0]).toMatchObject({ txnNo: "WX-BAD-001" });
  });

  it("detects Alipay and WeChat files from bill headers", () => {
    expect(detectExpenseImportPlatform(readFileSync(fixturePath("alipay-sample.csv")))).toEqual({
      platform: "alipay",
      encoding: "gbk",
    });
    expect(detectExpenseImportPlatform(readFileSync(fixturePath("wechat-sample.csv")))).toEqual({
      platform: "wechat",
      encoding: "utf8",
    });
    expect(detectExpenseImportPlatform(Buffer.from("交易时间,金额\n2026-01-01,1"))).toEqual({
      platform: null,
      encoding: "utf8",
    });
  });
});

describe("categorizeExpenseTransaction", () => {
  const categories = [
    { id: "shopping", name: "购物", direction: "EXPENSE" as const, keywords: ["咖啡店"], sort: 20 },
    { id: "food", name: "餐饮", direction: "EXPENSE" as const, keywords: ["咖啡"], sort: 10 },
    { id: "income", name: "其他收入", direction: "INCOME" as const, keywords: ["退款"], sort: 30 },
  ];

  it("matches merchant and item keywords by category sort order", () => {
    expect(
      categorizeExpenseTransaction(
        {
          direction: "EXPENSE",
          merchant: "上海咖啡店",
          item: "拿铁",
          sourceCategory: null,
        },
        categories,
      ),
    ).toBe("food");
  });

  it("falls back to Alipay source category mapping when keywords miss", () => {
    expect(
      categorizeExpenseTransaction(
        {
          direction: "EXPENSE",
          merchant: "未知商户",
          item: "未知商品",
          sourceCategory: "餐饮美食",
        },
        categories,
      ),
    ).toBe("food");
  });

  it("returns null when no category matches the transaction direction", () => {
    expect(
      categorizeExpenseTransaction(
        {
          direction: "INCOME",
          merchant: "工资",
          item: "六月工资",
          sourceCategory: null,
        },
        categories,
      ),
    ).toBeNull();
  });
});

describe("expense import executor helpers", () => {
  const categories = [
    { id: "food", name: "餐饮", direction: "EXPENSE" as const, keywords: ["便利店"], sort: 10 },
    { id: "income", name: "其他收入", direction: "INCOME" as const, keywords: ["朋友"], sort: 20 },
  ];

  it("builds preview stats with duplicate and filtered counts", () => {
    const parsed = parseExpenseImportFile(readFileSync(fixturePath("wechat-sample.csv")), "wechat");
    const preview = buildExpenseImportPreview(parsed, categories, new Set(["WX-INC-001"]));

    expect(preview.stats).toEqual({
      parsed: 3,
      willImport: 2,
      duplicate: 1,
      filtered: 2,
      failed: 1,
    });
    expect(preview.rows).toHaveLength(3);
    expect(preview.rows[0]).toMatchObject({
      txnNo: "WX-EXP-001",
      categoryId: "food",
      duplicate: false,
      importable: true,
    });
    expect(preview.rows[1]).toMatchObject({
      txnNo: "WX-INC-001",
      categoryId: "income",
      duplicate: true,
      importable: false,
    });
  });

  it("normalizes parsed rows for Prisma create data", () => {
    const parsed = parseExpenseImportFile(readFileSync(fixturePath("alipay-sample.csv")), "alipay");
    const rows = normalizeImportRowsForCreate(parsed, categories, new Set(["ALI-INC-001"]), "batch-1");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      platform: "alipay",
      txnNo: "ALI-EXP-001",
      amount: "18.50",
      direction: "EXPENSE",
      importBatchId: "batch-1",
    });
    expect(rows[0].txnTime).toBeInstanceOf(Date);
    expect(rows[0].raw).toMatchObject({ 交易订单号: "ALI-EXP-001" });
  });
});
