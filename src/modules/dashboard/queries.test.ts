import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { getDashboardTodos, getDashboardYearNumbers } from "./queries";

vi.mock("@/lib/db", () => ({
  db: {
    activity: {
      count: vi.fn(),
    },
    expenseCategory: {
      findMany: vi.fn(),
    },
    game: {
      count: vi.fn(),
    },
    mediaItem: {
      count: vi.fn(),
    },
    post: {
      count: vi.fn(),
    },
    todo: {
      findMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const findTodos = vi.mocked(db.todo.findMany);
const countActivities = vi.mocked(db.activity.count);
const countGames = vi.mocked(db.game.count);
const countMedia = vi.mocked(db.mediaItem.count);
const countPosts = vi.mocked(db.post.count);

describe("dashboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-06-15T02:00:00.000Z"));
  });

  it("queries dashboard todos with the same UTC date sentinel used by Todo writes", async () => {
    findTodos.mockResolvedValue([]);

    await getDashboardTodos();

    expect(findTodos).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          done: false,
          date: {
            lte: new Date("2026-06-15T00:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("counts yearly finished games from activity timestamps instead of updatedAt", async () => {
    countActivities.mockResolvedValue(2);
    countMedia.mockResolvedValueOnce(3).mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    countPosts.mockResolvedValue(5);

    await expect(getDashboardYearNumbers()).resolves.toMatchObject({
      gamesFinished: 2,
      booksDone: 3,
      moviesDone: 3,
      tvDone: 1,
      posts: 5,
    });

    expect(countGames).not.toHaveBeenCalled();
    expect(countActivities).toHaveBeenCalledWith({
      where: {
        module: "games",
        action: "finished",
        happenedAt: {
          gte: new Date("2025-12-31T16:00:00.000Z"),
          lt: new Date("2026-12-31T16:00:00.000Z"),
        },
      },
    });
  });
});
