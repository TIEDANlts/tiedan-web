import { describe, expect, it } from "vitest";

import {
  defaultGameFilters,
  nextGameStatus,
  normalizeGameInput,
  parseGameFilters,
} from "./utils";

describe("normalizeGameInput", () => {
  it("normalizes manual game fields", () => {
    const result = normalizeGameInput({
      name: "  塞尔达传说  ",
      platform: " Switch ",
      coverUrl: " https://example.com/cover.jpg ",
      status: "PLAYING",
      rating: "9",
      playtimeHours: "1.5",
      lastPlayedAt: "2026-06-14T20:30",
      tags: [" 任天堂 ", "开放世界", "任天堂"],
      reviewMd: "  好玩  ",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        name: "塞尔达传说",
        platform: "Switch",
        coverUrl: "https://example.com/cover.jpg",
        status: "PLAYING",
        rating: 9,
        playtimeMin: 90,
        tags: ["任天堂", "开放世界"],
        reviewMd: "好玩",
      },
    });

    expect(result.ok && result.data.lastPlayedAt).toBeInstanceOf(Date);
  });

  it("rejects missing required fields and out-of-range values", () => {
    const result = normalizeGameInput({
      name: " ",
      platform: "",
      coverUrl: "ftp://example.com/cover.jpg",
      status: "DONE",
      rating: "11",
      playtimeHours: "-1",
      lastPlayedAt: "not-a-date",
      tags: "",
      reviewMd: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        name: "名称不能为空。",
        platform: "平台不能为空。",
        coverUrl: "封面必须是 /uploads/ 路径或 http(s) 图片链接。",
        status: "请选择有效的游戏状态。",
        rating: "评分必须是 1 到 10 的整数。",
        playtimeHours: "已玩时长不能小于 0。",
        lastPlayedAt: "最近游玩时间格式不正确。",
      },
    });
  });
});

describe("parseGameFilters", () => {
  it("keeps valid filters and falls back from invalid status and sort", () => {
    expect(
      parseGameFilters({
        status: "PLAYING",
        platform: "Switch",
        tags: "RPG, 任天堂 ,,RPG",
        q: " zelda ",
        sort: "rating",
      }),
    ).toEqual({
      status: "PLAYING",
      platform: "Switch",
      tags: ["RPG", "任天堂"],
      query: "zelda",
      sort: "rating",
    });

    expect(parseGameFilters({ status: "DONE", sort: "updated" })).toEqual(defaultGameFilters);
  });
});

describe("nextGameStatus", () => {
  it("advances through the high-frequency manual flow", () => {
    expect(nextGameStatus("WISHLIST")).toBe("PLAYING");
    expect(nextGameStatus("PLAYING")).toBe("FINISHED");
    expect(nextGameStatus("BACKLOG")).toBe("PLAYING");
    expect(nextGameStatus("FINISHED")).toBeNull();
    expect(nextGameStatus("SHELVED")).toBeNull();
  });
});
