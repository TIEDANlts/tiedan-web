import { describe, expect, it, vi } from "vitest";

import { executeMediaImportRows, type MediaImportExecutorDeps } from "./import-executor";
import type { MediaImportRowData } from "./import-parser";

function row(patch: Partial<MediaImportRowData>): MediaImportRowData {
  return {
    type: "BOOK",
    title: "活着",
    status: "DONE",
    rating: 10,
    reviewMd: "短评",
    markedAt: "2024-02-03",
    doubanId: "4913064",
    year: 1993,
    coverUrl: "https://img.example.com/book.jpg",
    ...patch,
  };
}

function createDeps(patch: Partial<MediaImportExecutorDeps> = {}): MediaImportExecutorDeps {
  return {
    hasDoubanId: vi.fn().mockResolvedValue(false),
    hasWeakKey: vi.fn().mockResolvedValue(false),
    saveCover: vi.fn().mockResolvedValue("/uploads/media/local.webp"),
    createItem: vi.fn().mockResolvedValue(undefined),
    ...patch,
  };
}

describe("executeMediaImportRows", () => {
  it("skips rows duplicated by douban id or weak type-title-year key", async () => {
    const deps = createDeps({
      hasDoubanId: vi.fn().mockImplementation(async (doubanId: string) => doubanId === "4913064"),
      hasWeakKey: vi.fn().mockImplementation(async (_type, title) => title === "无链接条目"),
    });

    const result = await executeMediaImportRows(
      [
        row({ title: "活着", doubanId: "4913064" }),
        row({ title: "无链接条目", doubanId: null, year: 2020 }),
      ],
      deps,
    );

    expect(result).toMatchObject({
      success: 0,
      skipped: 2,
      failed: 0,
    });
    expect(result.reasons).toEqual([
      { rowNumber: 1, type: "skipped", message: "豆瓣 ID 已存在，已跳过。" },
      { rowNumber: 2, type: "skipped", message: "同类型、标题与年份的条目已存在，已跳过。" },
    ]);
    expect(deps.createItem).not.toHaveBeenCalled();
  });

  it("places marked date on finishedAt or startedAt based on imported status", async () => {
    const deps = createDeps();

    await executeMediaImportRows(
      [
        row({ title: "读过的书", status: "DONE", markedAt: "2024-02-03" }),
        row({ title: "在读的书", status: "DOING", markedAt: "2024-03-04" }),
      ],
      deps,
    );

    expect(deps.createItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: "读过的书",
        startedAt: null,
        finishedAt: new Date("2024-02-03T00:00:00.000Z"),
      }),
    );
    expect(deps.createItem).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        title: "在读的书",
        startedAt: new Date("2024-03-04T00:00:00.000Z"),
        finishedAt: null,
      }),
    );
  });

  it("does not fail a row or persist an external cover when cover localization fails", async () => {
    const deps = createDeps({
      saveCover: vi.fn().mockRejectedValue(new Error("download failed")),
    });

    const result = await executeMediaImportRows([row({ coverUrl: "https://img.example.com/broken.jpg" })], deps);

    expect(result).toMatchObject({
      success: 1,
      skipped: 0,
      failed: 0,
    });
    expect(result.reasons).toEqual([
      { rowNumber: 1, type: "warning", message: "封面转存失败，已留空封面继续导入。" },
    ]);
    expect(deps.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        coverUrl: null,
      }),
    );
  });
});
