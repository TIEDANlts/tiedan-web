import { readFile } from "node:fs/promises";
import path from "node:path";
import iconv from "iconv-lite";
import { describe, expect, it } from "vitest";

import {
  decodeMediaCsv,
  extractDoubanId,
  guessMediaImportMapping,
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

  it("falls back to gbk when utf-8 decoding produces replacement characters", async () => {
    const utf8Text = await readFile(fixturePath, "utf8");
    const gbkBuffer = iconv.encode(utf8Text, "gbk");

    const decoded = decodeMediaCsv(gbkBuffer);

    expect(decoded.encoding).toBe("gbk");
    expect(decoded.text).toContain("书影音名");
    expect(decoded.text).toContain("花样年华");
  });
});
