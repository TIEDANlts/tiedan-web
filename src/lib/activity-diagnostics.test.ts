import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "./db";
import { findOrphanActivities } from "./activity-diagnostics";

vi.mock("./db", () => ({
  db: {
    activity: {
      findMany: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
    },
    mediaItem: {
      findMany: vi.fn(),
    },
    trip: {
      findMany: vi.fn(),
    },
    importBatch: {
      findMany: vi.fn(),
    },
  },
}));

const findActivities = vi.mocked(db.activity.findMany);
const findPosts = vi.mocked(db.post.findMany);
const findMediaItems = vi.mocked(db.mediaItem.findMany);
const findTrips = vi.mocked(db.trip.findMany);
const findImportBatches = vi.mocked(db.importBatch.findMany);

describe("findOrphanActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports orphan post, media, trip and expense import activities without deleting anything", async () => {
    const happenedAt = new Date("2026-06-18T08:00:00.000Z");
    findActivities.mockResolvedValue([
      { id: "a-post-ok", module: "posts", action: "published", refId: "post-ok", title: "文章还在", happenedAt },
      { id: "a-post-missing", module: "posts", action: "published", refId: "post-missing", title: "文章丢了", happenedAt },
      { id: "a-media-missing", module: "media", action: "done", refId: "media-missing", title: "书影丢了", happenedAt },
      { id: "a-trip-missing", module: "trips", action: "done", refId: "trip-missing", title: "旅行丢了", happenedAt },
      { id: "a-expense-missing", module: "expenses", action: "imported", refId: "batch-missing", title: "导入丢了", happenedAt },
      { id: "a-game", module: "games", action: "finished", refId: "game-1", title: "游戏不诊断", happenedAt },
    ] as never);
    findPosts.mockResolvedValue([{ id: "post-ok" }] as never);
    findMediaItems.mockResolvedValue([] as never);
    findTrips.mockResolvedValue([] as never);
    findImportBatches.mockResolvedValue([] as never);

    await expect(findOrphanActivities()).resolves.toEqual([
      expect.objectContaining({
        id: "a-post-missing",
        module: "posts",
        refId: "post-missing",
        reason: "文章已不存在。",
      }),
      expect.objectContaining({
        id: "a-media-missing",
        module: "media",
        refId: "media-missing",
        reason: "书影条目已不存在。",
      }),
      expect.objectContaining({
        id: "a-trip-missing",
        module: "trips",
        refId: "trip-missing",
        reason: "旅行已不存在。",
      }),
      expect.objectContaining({
        id: "a-expense-missing",
        module: "expenses",
        refId: "batch-missing",
        reason: "账单导入批次已不存在。",
      }),
    ]);

    expect(findPosts).toHaveBeenCalledWith({
      where: { id: { in: ["post-ok", "post-missing"] } },
      select: { id: true },
    });
  });
});
