import { describe, expect, it } from "vitest";

import {
  getModuleColor,
  getStatusColor,
  moduleColors,
  statusColorMap,
} from "./design";

describe("design module colors", () => {
  it("keeps module colors aligned with PLAN.md 1.7", () => {
    expect(moduleColors).toMatchObject({
      games: "#8A4FA0",
      media: "#D08A1E",
      trips: "#1F9E86",
      expenses: "#D6537E",
      todos: "#3B82C4",
      posts: "#8C2F39",
      links: "#64748B",
      specialDays: "#F59E0B",
    });
  });

  it("returns known module colors and falls back to links for unknown values", () => {
    expect(getModuleColor("games")).toBe("#8A4FA0");
    expect(getModuleColor("missing")).toBe("#64748B");
  });
});

describe("design status colors", () => {
  it("provides common status mappings and a neutral fallback", () => {
    expect(statusColorMap.done.label).toBe("完成");
    expect(statusColorMap.done.color).toBe("#1F9E86");
    expect(getStatusColor("playing").label).toBe("进行中");
    expect(getStatusColor("unknown").label).toBe("未分类");
    expect(getStatusColor("unknown").color).toBe("#64748B");
  });
});
