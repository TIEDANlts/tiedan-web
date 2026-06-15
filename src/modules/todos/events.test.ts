import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../lib/db";
import { moduleColors } from "../../lib/design";
import { getEvents } from "./events";

vi.mock("../../lib/db", () => ({
  db: {
    todo: {
      findMany: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(db.todo.findMany);

describe("todo calendar events", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("renders dated completed todos with a check prefix and dimmed module color", async () => {
    findMany.mockResolvedValue([
      {
        id: "todo-1",
        content: "交水电费",
        date: new Date("2026-06-20T00:00:00.000Z"),
        priority: 0,
        done: true,
        doneAt: new Date("2026-06-19T10:00:00.000Z"),
        createdAt: new Date("2026-06-18T10:00:00.000Z"),
      },
    ]);

    await expect(getEvents("2026-06-01", "2026-07-01")).resolves.toEqual([
      expect.objectContaining({
        id: "todos:todo-1",
        module: "todos",
        title: "✓ 交水电费",
        start: "2026-06-20",
        allDay: true,
        color: `${moduleColors.todos}99`,
        href: "/todos",
      }),
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        date: {
          gte: new Date("2026-06-01T00:00:00.000Z"),
          lt: new Date("2026-07-01T00:00:00.000Z"),
        },
      }),
    }));
  });
});
