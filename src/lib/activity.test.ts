import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "./db";
import {
  activityHref,
  expenseImportTitle,
  gameFinishedTitle,
  groupActivitiesByDay,
  mediaDoneTitle,
  postPublishedTitle,
  recordActivity,
  getRecentActivityGroups,
  shouldRecordStatusTransition,
  tripDoneTitle,
} from "./activity";

vi.mock("./db", () => ({
  db: {
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
    },
  },
}));

const create = vi.mocked(db.activity.create);
const findActivities = vi.mocked(db.activity.findMany);
const findPosts = vi.mocked(db.post.findMany);

describe("recordActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a cross-module activity entry", async () => {
    create.mockResolvedValue({
      id: "activity-1",
      module: "games",
      action: "finished",
      refId: "game-1",
      title: "通关了《星露谷物语》",
      happenedAt: new Date("2026-06-15T12:00:00.000Z"),
    });

    await recordActivity("games", "finished", "game-1", "通关了《星露谷物语》");

    expect(create).toHaveBeenCalledWith({
      data: {
        module: "games",
        action: "finished",
        refId: "game-1",
        title: "通关了《星露谷物语》",
      },
    });
  });
});

describe("activity titles and transition guards", () => {
  it("only records a target status when the value changes into that status", () => {
    expect(shouldRecordStatusTransition("PLAYING", "FINISHED", "FINISHED")).toBe(true);
    expect(shouldRecordStatusTransition("FINISHED", "FINISHED", "FINISHED")).toBe(false);
    expect(shouldRecordStatusTransition("PLAYING", "BACKLOG", "FINISHED")).toBe(false);
  });

  it("builds the expected Chinese timeline titles", () => {
    expect(gameFinishedTitle("星露谷物语")).toBe("通关了《星露谷物语》");
    expect(mediaDoneTitle("BOOK", "活着")).toBe("读完《活着》");
    expect(mediaDoneTitle("MOVIE", "花样年华")).toBe("看完《花样年华》");
    expect(mediaDoneTitle("TV", "漫长的季节")).toBe("看完《漫长的季节》");
    expect(postPublishedTitle("第一篇文章")).toBe("发布了文章《第一篇文章》");
    expect(tripDoneTitle("杭州三日")).toBe("完成了旅行：杭州三日");
    expect(expenseImportTitle(12)).toBe("导入了 12 笔账单");
  });
});

describe("activityHref", () => {
  it("maps activities to their module pages", () => {
    expect(activityHref({ module: "games", action: "finished", refId: "game-1" })).toBe("/games");
    expect(activityHref({ module: "media", action: "done", refId: "media-1" })).toBe("/media/media-1");
    expect(activityHref({ module: "posts", action: "published", refId: "post-1" })).toBe("/admin/posts/post-1");
    expect(activityHref({ module: "trips", action: "done", refId: "trip-1" })).toBe("/trips/trip-1");
    expect(activityHref({ module: "expenses", action: "imported", refId: "batch-1" })).toBe("/expenses/import/result/batch-1");
  });
});

describe("groupActivitiesByDay", () => {
  it("groups recent activities by Shanghai calendar day", () => {
    expect(
      groupActivitiesByDay([
        {
          id: "1",
          module: "posts",
          action: "published",
          refId: "a",
          title: "发布了文章《A》",
          happenedAt: new Date("2026-06-15T01:00:00.000Z"),
        },
        {
          id: "2",
          module: "games",
          action: "finished",
          refId: "b",
          title: "通关了《B》",
          happenedAt: new Date("2026-06-14T16:30:00.000Z"),
        },
        {
          id: "3",
          module: "media",
          action: "done",
          refId: "c",
          title: "读完《C》",
          happenedAt: new Date("2026-06-13T15:59:00.000Z"),
        },
      ]),
    ).toEqual([
      {
        date: "2026-06-15",
        label: "6月15日",
        items: expect.arrayContaining([
          expect.objectContaining({ id: "1", href: "/admin/posts/a" }),
          expect.objectContaining({ id: "2", href: "/games" }),
        ]),
      },
      {
        date: "2026-06-13",
        label: "6月13日",
        items: [expect.objectContaining({ id: "3", href: "/media/c" })],
      },
    ]);
  });
});

describe("getRecentActivityGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves published post activity ids to current public slugs", async () => {
    findActivities.mockResolvedValue([
      {
        id: "1",
        module: "posts",
        action: "published",
        refId: "post-1",
        title: "发布了文章《A》",
        happenedAt: new Date("2026-06-15T01:00:00.000Z"),
      },
    ]);
    findPosts.mockResolvedValue([{ id: "post-1", slug: "current-slug" }] as never);

    await expect(getRecentActivityGroups()).resolves.toEqual([
      expect.objectContaining({
        items: [expect.objectContaining({ href: "/blog/current-slug" })],
      }),
    ]);
    expect(findPosts).toHaveBeenCalledWith({
      where: { id: { in: ["post-1"] } },
      select: { id: true, slug: true },
    });
  });
});
