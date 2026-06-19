import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/activity", () => ({
  expenseImportTitle: vi.fn(),
  recordActivity: vi.fn(),
}));

import { categorizeExpenseTransaction } from "./categorize";
import { EXPENSE_IMPORT_MAX_COLUMNS, EXPENSE_IMPORT_MAX_ROWS } from "./parsers/common";
import { buildExpenseImportPreview, normalizeImportRowsForCreate } from "./import-executor";
import { detectExpenseImportPlatform, parseExpenseImportFile } from "./parsers";
import { EXPENSE_IMPORT_MAX_BYTES, parseExpenseImportFileAction, validateExpenseImportFile } from "./actions";

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

describe("parseExpenseImportFile column alignment", () => {
  it("keeps columns aligned when the header row has a blank cell in the middle", () => {
    // 表头在「收/支」和「金额」之间插入了一个空列，数据行对应位置是占位值 "X"。
    // 旧实现会用 headers.filter(Boolean) 压缩表头下标，导致金额/订单号整体错位，
    // 把金额读成 "X" 从而判为错误行；修复后应正确解析。
    const csv = [
      "支付宝交易记录明细",
      "交易时间,收/支,,金额,交易订单号,交易状态",
      "2026-06-01 08:12:03,支出,X,18.50,ALI-MID-001,交易成功",
    ].join("\n");

    const result = parseExpenseImportFile(Buffer.from(csv, "utf-8"), "alipay");

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      txnTime: "2026-06-01 08:12:03",
      direction: "EXPENSE",
      amount: "18.50",
      txnNo: "ALI-MID-001",
    });
  });
});

describe("expense import file boundaries", () => {
  it("rejects oversized files before reading arrayBuffer", () => {
    const arrayBuffer = vi.fn();
    const file = new File([new Uint8Array(1)], "alipay.csv", { type: "text/csv" });

    Object.defineProperty(file, "size", { value: EXPENSE_IMPORT_MAX_BYTES + 1 });
    Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });

    const result = validateExpenseImportFile(file);

    expect(result).toEqual({ ok: false, message: "账单文件不能超过 10MB，请拆分后导入。" });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects oversized files in the server action before reading arrayBuffer", async () => {
    const arrayBuffer = vi.fn();
    const file = new File([new Uint8Array(1)], "alipay.csv", { type: "text/csv" });
    const formData = new FormData();

    Object.defineProperty(file, "size", { value: EXPENSE_IMPORT_MAX_BYTES + 1 });
    Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });
    formData.set("file", file);
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(parseExpenseImportFileAction(formData)).resolves.toEqual({
      ok: false,
      message: "账单文件不能超过 10MB，请拆分后导入。",
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("returns a parser error when the CSV has too many rows", () => {
    const csv = [
      "支付宝交易记录明细",
      "交易时间,收/支,金额,交易订单号,交易状态",
      ...Array.from({ length: EXPENSE_IMPORT_MAX_ROWS + 1 }, (_, index) =>
        `2026-06-01 08:12:03,支出,18.50,ALI-LIMIT-${index},交易成功`,
      ),
    ].join("\n");

    const result = parseExpenseImportFile(Buffer.from(csv, "utf-8"), "alipay");

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        rowNumber: 0,
        message: `导入文件不能超过 ${EXPENSE_IMPORT_MAX_ROWS} 行，请拆分后再导入。`,
      }),
    );
  });

  it("does not expand oversized CSV sheets with sheet_to_json", () => {
    const csv = [
      "支付宝交易记录明细",
      "交易时间,收/支,金额,交易订单号,交易状态",
      ...Array.from({ length: EXPENSE_IMPORT_MAX_ROWS + 1 }, (_, index) =>
        `2026-06-01 08:12:03,支出,18.50,ALI-LIMIT-${index},交易成功`,
      ),
    ].join("\n");
    const sheetToJson = vi.spyOn(XLSX.utils, "sheet_to_json");

    try {
      const result = parseExpenseImportFile(Buffer.from(csv, "utf-8"), "alipay");

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rowNumber: 0,
          message: `导入文件不能超过 ${EXPENSE_IMPORT_MAX_ROWS} 行，请拆分后再导入。`,
        }),
      );
      expect(sheetToJson).not.toHaveBeenCalled();
    } finally {
      sheetToJson.mockRestore();
    }
  });

  it("returns a parser error when the CSV has too many columns", () => {
    const headers = [
      "交易时间",
      "收/支",
      "金额",
      "交易订单号",
      "交易状态",
      ...Array.from({ length: EXPENSE_IMPORT_MAX_COLUMNS - 4 }, (_, index) => `额外列${index}`),
    ];
    const csv = ["支付宝交易记录明细", headers.join(","), headers.map(() => "x").join(",")].join("\n");

    const result = parseExpenseImportFile(Buffer.from(csv, "utf-8"), "alipay");

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        rowNumber: 0,
        message: `导入文件不能超过 ${EXPENSE_IMPORT_MAX_COLUMNS} 列，请删减后再导入。`,
      }),
    );
  });
});
