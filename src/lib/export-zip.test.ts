import { describe, expect, it } from "vitest";

import { createJsonZip, readJsonZipEntries } from "./export-zip";

describe("createJsonZip", () => {
  it("creates a readable zip with manifest counts matching JSON rows", () => {
    const generatedAt = "2026-06-15T12:00:00.000Z";
    const zip = createJsonZip({
      generatedAt,
      tables: {
        Game: [{ id: "game-1", name: "星露谷物语" }],
        Activity: [
          {
            id: "activity-1",
            module: "games",
            action: "finished",
            refId: "game-1",
            title: "通关了《星露谷物语》",
            happenedAt: generatedAt,
          },
        ],
      },
    });

    const entries = readJsonZipEntries(zip);

    expect(Object.keys(entries).sort()).toEqual(["Activity.json", "Game.json", "manifest.json"]);
    expect(entries["Game.json"]).toEqual([{ id: "game-1", name: "星露谷物语" }]);
    expect(entries["manifest.json"]).toEqual({
      exportedAt: generatedAt,
      tables: {
        Game: { file: "Game.json", count: 1 },
        Activity: { file: "Activity.json", count: 1 },
      },
      note: "图片不包含在导出包内；JSON 保留图片 URL/key，图片随服务器 uploads 卷与每日备份保存。",
    });
  });
});
