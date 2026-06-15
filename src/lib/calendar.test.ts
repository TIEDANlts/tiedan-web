import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAllEvents } from "./calendar";

vi.mock("../modules/todos/events", () => ({
  getEvents: vi.fn().mockResolvedValue([{ id: "todos:1", module: "todos", title: "todo" }]),
}));
vi.mock("../modules/trips/events", () => ({
  getEvents: vi.fn().mockResolvedValue([{ id: "trips:1", module: "trips", title: "trip" }]),
}));
vi.mock("../modules/special-days/events", () => ({
  getEvents: vi.fn().mockResolvedValue([{ id: "specialDays:1", module: "specialDays", title: "day" }]),
}));
vi.mock("../modules/media/events", () => ({
  getEvents: vi.fn().mockResolvedValue([{ id: "media:1", module: "media", title: "media" }]),
}));

describe("getAllEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates events from every calendar-enabled module", async () => {
    await expect(getAllEvents("2026-06-01", "2026-07-01")).resolves.toEqual([
      { id: "todos:1", module: "todos", title: "todo" },
      { id: "trips:1", module: "trips", title: "trip" },
      { id: "specialDays:1", module: "specialDays", title: "day" },
      { id: "media:1", module: "media", title: "media" },
    ]);
  });
});
