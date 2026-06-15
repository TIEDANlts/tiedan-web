import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../lib/db";
import { moduleColors } from "../../lib/design";
import { getEvents } from "./events";

vi.mock("../../lib/db", () => ({
  db: {
    trip: {
      findMany: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(db.trip.findMany);

describe("trip calendar events", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("renders a cross-month trip as an all-day band with an exclusive next-day end", async () => {
    findMany.mockResolvedValue([
      {
        id: "trip-1",
        title: "北海道",
        status: "PLANNED",
        startDate: new Date("2026-01-31T00:00:00.000Z"),
        endDate: new Date("2026-02-02T00:00:00.000Z"),
      },
      {
        id: "trip-2",
        title: "成都",
        status: "DONE",
        startDate: new Date("2026-02-03T00:00:00.000Z"),
        endDate: new Date("2026-02-03T00:00:00.000Z"),
      },
    ] as Awaited<ReturnType<typeof db.trip.findMany>>);

    const events = await getEvents("2026-01-01", "2026-03-01");

    expect(events[0]).toMatchObject({
      id: "trips:trip-1",
      module: "trips",
      title: "北海道",
      start: "2026-01-31",
      end: "2026-02-03",
      allDay: true,
      color: moduleColors.trips,
      href: "/trips/trip-1",
    });
    expect(events[1]?.color).toBe(`${moduleColors.trips}B3`);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        startDate: { lt: new Date("2026-03-01T00:00:00.000Z") },
        endDate: { gte: new Date("2026-01-01T00:00:00.000Z") },
      },
    }));
  });
});
