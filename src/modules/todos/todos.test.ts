import { describe, expect, test } from "vitest";

import {
  buildFutureDayGroups,
  dateToTodoDb,
  getOverdueDays,
  isOverdue,
  moveOverdueToTodayInput,
  readCreateTodoFormData,
} from "./utils";

describe("todo date logic", () => {
  test("treats an unfinished todo from yesterday as overdue in Shanghai time", () => {
    const today = "2026-06-13";

    expect(isOverdue({ date: "2026-06-12", done: false }, today)).toBe(true);
    expect(getOverdueDays("2026-06-12", today)).toBe(1);
  });

  test("groups the next 7 future days correctly across a month boundary", () => {
    const groups = buildFutureDayGroups(
      [
        {
          id: "month-end",
          content: "月底任务",
          date: "2026-02-28",
          priority: 0,
          done: false,
          doneAt: null,
          createdAt: "2026-02-27 10:00",
        },
        {
          id: "next-month",
          content: "月初任务",
          date: "2026-03-01",
          priority: 1,
          done: false,
          doneAt: null,
          createdAt: "2026-02-27 10:00",
        },
      ],
      "2026-02-27",
    );

    expect(groups.map((group) => group.date)).toContain("2026-02-28");
    expect(groups.map((group) => group.date)).toContain("2026-03-01");
    expect(groups.find((group) => group.date === "2026-02-28")?.items[0]?.id).toBe("month-end");
    expect(groups.find((group) => group.date === "2026-03-01")?.items[0]?.id).toBe("next-month");
  });

  test("moves overdue todos to today using Shanghai date", () => {
    const updates = moveOverdueToTodayInput(
      [
        { id: "overdue", date: "2026-02-28", done: false },
        { id: "done", date: "2026-02-27", done: true },
        { id: "future", date: "2026-03-02", done: false },
      ],
      "2026-03-01T01:30:00+08:00",
    );

    expect(updates).toEqual([{ id: "overdue", date: "2026-03-01" }]);
  });
});

describe("readCreateTodoFormData", () => {
  test("creates a today todo by default", () => {
    const formData = new FormData();
    formData.set("content", "  Write notes ");
    formData.set("target", "today");
    formData.set("priority", "2");

    const result = readCreateTodoFormData(formData, "2026-06-18");

    expect(result).toEqual({
      ok: true,
      data: {
        content: "Write notes",
        date: new Date("2026-06-18T00:00:00.000Z"),
        priority: 2,
      },
    });
  });

  test("rejects invalid custom dates", () => {
    const formData = new FormData();
    formData.set("content", "Write notes");
    formData.set("target", "date");
    formData.set("date", "bad-date");

    const result = readCreateTodoFormData(formData, "2026-06-18");

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errors.date).toBeTruthy();
  });

  test("rejects normalized invalid custom dates", () => {
    const formData = new FormData();
    formData.set("content", "Write notes");
    formData.set("target", "date");
    formData.set("date", "2026-02-31");

    const result = readCreateTodoFormData(formData, "2026-06-18");

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errors.date).toBeTruthy();
  });

  test("accepts leap-day custom dates", () => {
    const formData = new FormData();
    formData.set("content", "Write notes");
    formData.set("target", "date");
    formData.set("date", "2024-02-29");

    const result = readCreateTodoFormData(formData, "2026-06-18");

    expect(result).toMatchObject({
      ok: true,
      data: {
        date: new Date("2024-02-29T00:00:00.000Z"),
      },
    });
  });
});

describe("dateToTodoDb", () => {
  test("rejects normalized invalid date text", () => {
    expect(dateToTodoDb("2026-02-31")).toBeNull();
  });
});
