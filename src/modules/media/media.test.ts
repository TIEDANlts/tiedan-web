import { describe, expect, it } from "vitest";

import {
  applyMediaStatusDates,
  defaultMediaFilters,
  mediaStatusLabel,
  normalizeMediaInput,
  parseMediaFilters,
} from "./utils";

describe("normalizeMediaInput", () => {
  it("normalizes manual media fields", () => {
    const result = normalizeMediaInput({
      type: "BOOK",
      title: "  三体  ",
      originalTitle: " The Three-Body Problem ",
      creator: " 刘慈欣 ",
      year: "2008",
      coverUrl: " https://example.com/cover.jpg ",
      status: "WISHLIST",
      rating: "9",
      startedAt: "2026-06-01",
      finishedAt: "2026-06-14",
      releaseDate: "2026-01-01",
      reviewMd: "  很好  ",
      hasSpoiler: "on",
      tags: [" 科幻 ", "雨果奖", "科幻"],
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        type: "BOOK",
        title: "三体",
        originalTitle: "The Three-Body Problem",
        creator: "刘慈欣",
        year: 2008,
        coverUrl: "https://example.com/cover.jpg",
        status: "WISHLIST",
        rating: 9,
        reviewMd: "很好",
        hasSpoiler: true,
        tags: ["科幻", "雨果奖"],
      },
    });
    expect(result.ok && result.data.startedAt).toBeInstanceOf(Date);
    expect(result.ok && result.data.finishedAt).toBeInstanceOf(Date);
    expect(result.ok && result.data.releaseDate).toBeInstanceOf(Date);
  });

  it("rejects missing title and out-of-range values", () => {
    const result = normalizeMediaInput({
      type: "ALBUM",
      title: " ",
      year: "1899",
      coverUrl: "ftp://example.com/cover.jpg",
      status: "FINISHED",
      rating: "11",
      startedAt: "bad-date",
      finishedAt: "bad-date",
      releaseDate: "bad-date",
      tags: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        type: "请选择有效的书影类型。",
        title: "标题不能为空。",
        year: "年份必须在 1900 到 2100 之间。",
        coverUrl: "封面必须是 /uploads/ 路径或 http(s) 图片链接。",
        status: "请选择有效的书影状态。",
        rating: "评分必须是 1 到 10 的整数。",
        startedAt: "开始日期格式不正确。",
        finishedAt: "完成日期格式不正确。",
        releaseDate: "上映/出版日期格式不正确。",
      },
    });
  });
});

describe("parseMediaFilters", () => {
  it("keeps valid filters and falls back from invalid type and status", () => {
    expect(
      parseMediaFilters({
        type: "TV",
        status: "DOING",
        tags: "悬疑, HBO ,,悬疑",
        q: " true detective ",
      }),
    ).toEqual({
      type: "TV",
      status: "DOING",
      tags: ["悬疑", "HBO"],
      query: "true detective",
    });

    expect(parseMediaFilters({ type: "GAME", status: "FINISHED" })).toEqual(defaultMediaFilters);
  });
});

describe("mediaStatusLabel", () => {
  it("uses reading labels for books and watching labels for video media", () => {
    expect(mediaStatusLabel("BOOK", "WISHLIST")).toBe("想读");
    expect(mediaStatusLabel("BOOK", "DOING")).toBe("在读");
    expect(mediaStatusLabel("BOOK", "DONE")).toBe("读过");
    expect(mediaStatusLabel("MOVIE", "WISHLIST")).toBe("想看");
    expect(mediaStatusLabel("TV", "DONE")).toBe("看过");
  });
});

describe("applyMediaStatusDates", () => {
  it("sets startedAt and finishedAt only when entering doing or done without dates", () => {
    const today = new Date("2026-06-14T00:00:00.000Z");

    expect(
      applyMediaStatusDates({
        status: "DOING",
        startedAt: null,
        finishedAt: null,
        today,
      }),
    ).toEqual({
      startedAt: today,
      finishedAt: null,
    });

    expect(
      applyMediaStatusDates({
        status: "DONE",
        startedAt: new Date("2026-06-01T00:00:00.000Z"),
        finishedAt: null,
        today,
      }),
    ).toEqual({
      startedAt: new Date("2026-06-01T00:00:00.000Z"),
      finishedAt: today,
    });

    expect(
      applyMediaStatusDates({
        status: "WISHLIST",
        startedAt: null,
        finishedAt: null,
        today,
      }),
    ).toEqual({
      startedAt: null,
      finishedAt: null,
    });
  });

  it("does not refill dates when saving an item already in the same status", () => {
    const today = new Date("2026-06-14T00:00:00.000Z");

    expect(
      applyMediaStatusDates({
        previousStatus: "DONE",
        status: "DONE",
        startedAt: null,
        finishedAt: null,
        today,
      }),
    ).toEqual({
      startedAt: null,
      finishedAt: null,
    });
  });
});
