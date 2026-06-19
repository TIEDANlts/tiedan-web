import { readFile } from "node:fs/promises";
import path from "node:path";
import iconv from "iconv-lite";
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
  mediaDoneTitle: vi.fn(),
  recordActivity: vi.fn(),
  shouldRecordStatusTransition: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  remoteImageErrorMessage: vi.fn(),
  saveFromUrl: vi.fn(),
}));

import { MEDIA_IMPORT_MAX_BYTES, parseMediaImportFileAction, validateMediaImportFile } from "./actions";
import {
  decodeMediaCsv,
  extractDoubanId,
  guessMediaImportMapping,
  MEDIA_IMPORT_MAX_COLUMNS,
  MEDIA_IMPORT_MAX_ROWS,
  normalizeMediaImportRow,
  parseMediaImportFile,
} from "./import-parser";

const fixturePath = path.join(process.cwd(), "tests", "fixtures", "doulist-sample.csv");

describe("media import parser", () => {
  it("guesses common douban export columns from headers", () => {
    const headers = ["书影音名", "类型", "我的评分", "短评", "标记日期", "豆瓣链接", "年份", "封面"];

    expect(guessMediaImportMapping(headers)).toEqual({
      title: "书影音名",
      type: "类型",
      rating: "我的评分",
      review: "短评",
      markedAt: "标记日期",
      link: "豆瓣链接",
      year: "年份",
      coverUrl: "封面",
      status: null,
    });
  });

  it("extracts douban subject id from book and movie links", () => {
    expect(extractDoubanId("https://book.douban.com/subject/4913064/")).toBe("4913064");
    expect(extractDoubanId("https://movie.douban.com/subject/1291557/?from=subject-page")).toBe("1291557");
    expect(extractDoubanId("https://example.com/subject/not-a-number")).toBeNull();
  });

  it("parses fixture rows and converts five-star ratings to ten-point ratings", async () => {
    const buffer = await readFile(fixturePath);
    const parsed = parseMediaImportFile(buffer, "doulist-sample.csv");
    const mapping = guessMediaImportMapping(parsed.headers);

    expect(parsed.encoding).toBe("utf8");
    expect(parsed.rows).toHaveLength(3);
    expect(
      normalizeMediaImportRow(parsed.rows[0], mapping, {
        defaultType: "BOOK",
        defaultStatus: "DONE",
        statusValueMap: {},
      }),
    ).toMatchObject({
      ok: true,
      data: {
        title: "活着",
        type: "BOOK",
        status: "DONE",
        rating: 10,
        reviewMd: "值得重读",
        markedAt: "2024-02-03",
        doubanId: "4913064",
        year: 1993,
        coverUrl: "https://img.example.com/book.jpg",
      },
    });

    expect(
      normalizeMediaImportRow(parsed.rows[1], mapping, {
        defaultType: "BOOK",
        defaultStatus: "DONE",
        statusValueMap: {},
      }),
    ).toMatchObject({
      ok: true,
      data: {
        title: "花样年华",
        type: "MOVIE",
        rating: 8,
        doubanId: "1291557",
      },
    });
  });

  it("rejects rows with invalid marked dates", () => {
    const result = normalizeMediaImportRow(
      {
        标题: "活着",
        标记日期: "2026-02-31",
      },
      {
        title: "标题",
        type: null,
        rating: null,
        review: null,
        markedAt: "标记日期",
        link: null,
        year: null,
        coverUrl: null,
        status: null,
      },
      {
        defaultType: "BOOK",
        defaultStatus: "DONE",
        statusValueMap: {},
      },
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errors).toContain("标记日期格式不正确。");
  });

  it("accepts leap-day marked dates and keeps empty dates null", () => {
    const mapping = {
      title: "标题",
      type: null,
      rating: null,
      review: null,
      markedAt: "标记日期",
      link: null,
      year: null,
      coverUrl: null,
      status: null,
    };
    const defaults = {
      defaultType: "BOOK" as const,
      defaultStatus: "DONE" as const,
      statusValueMap: {},
    };

    expect(
      normalizeMediaImportRow({ 标题: "Leap day", 标记日期: "2024-02-29" }, mapping, defaults),
    ).toMatchObject({
      ok: true,
      data: {
        markedAt: "2024-02-29",
      },
    });

    expect(
      normalizeMediaImportRow({ 标题: "No date", 标记日期: "" }, mapping, defaults),
    ).toMatchObject({
      ok: true,
      data: {
        markedAt: null,
      },
    });
  });

  it("falls back to gbk when utf-8 decoding produces replacement characters", async () => {
    const utf8Text = await readFile(fixturePath, "utf8");
    const gbkBuffer = iconv.encode(utf8Text, "gbk");

    const decoded = decodeMediaCsv(gbkBuffer);

    expect(decoded.encoding).toBe("gbk");
    expect(decoded.text).toContain("书影音名");
    expect(decoded.text).toContain("花样年华");
  });
});

describe("media import file boundaries", () => {
  it("rejects oversized files before reading arrayBuffer", () => {
    const arrayBuffer = vi.fn();
    const file = new File([new Uint8Array(1)], "douban.csv", { type: "text/csv" });

    Object.defineProperty(file, "size", { value: MEDIA_IMPORT_MAX_BYTES + 1 });
    Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });

    const result = validateMediaImportFile(file);

    expect(result).toEqual({ ok: false, message: "书影导入文件不能超过 20MB，请拆分后导入。" });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects oversized files in the server action before reading arrayBuffer", async () => {
    const arrayBuffer = vi.fn();
    const file = new File([new Uint8Array(1)], "douban.csv", { type: "text/csv" });
    const formData = new FormData();

    Object.defineProperty(file, "size", { value: MEDIA_IMPORT_MAX_BYTES + 1 });
    Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });
    formData.set("file", file);
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(parseMediaImportFileAction(formData)).resolves.toEqual({
      ok: false,
      message: "书影导入文件不能超过 20MB，请拆分后导入。",
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("throws a clear error when the import has too many rows", () => {
    const csv = [
      "标题,类型",
      ...Array.from({ length: MEDIA_IMPORT_MAX_ROWS + 1 }, (_, index) => `条目${index},BOOK`),
    ].join("\n");

    expect(() => parseMediaImportFile(Buffer.from(csv, "utf-8"), "douban.csv")).toThrow(
      `导入文件不能超过 ${MEDIA_IMPORT_MAX_ROWS} 行，请拆分后再导入。`,
    );
  });

  it("does not expand oversized XLSX sheets with sheet_to_json", () => {
    const workbook = XLSX.utils.book_new();
    const sheet: XLSX.WorkSheet = {
      "!ref": `A1:A${MEDIA_IMPORT_MAX_ROWS + 2}`,
      A1: { t: "s", v: "标题" },
    };

    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const sheetToJson = vi.spyOn(XLSX.utils, "sheet_to_json");

    try {
      expect(() => parseMediaImportFile(buffer, "douban.xlsx")).toThrow(
        `导入文件不能超过 ${MEDIA_IMPORT_MAX_ROWS} 行，请拆分后再导入。`,
      );
      expect(sheetToJson).not.toHaveBeenCalled();
    } finally {
      sheetToJson.mockRestore();
    }
  });

  it("throws a clear error when the import has too many columns", () => {
    const headers = Array.from({ length: MEDIA_IMPORT_MAX_COLUMNS + 1 }, (_, index) => `列${index}`);
    const csv = [headers.join(","), headers.map(() => "值").join(",")].join("\n");

    expect(() => parseMediaImportFile(Buffer.from(csv, "utf-8"), "douban.csv")).toThrow(
      `导入文件不能超过 ${MEDIA_IMPORT_MAX_COLUMNS} 列，请删减后再导入。`,
    );
  });
});
