import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { getTripDetail } from "./queries";

vi.mock("@/lib/db", () => ({
  db: {
    trip: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));

const findTrip = vi.mocked(db.trip.findUnique);

describe("trip queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fall back to legacy JSON when included location rows are empty", async () => {
    findTrip.mockResolvedValue({
      id: "trip-1",
      title: "杭州",
      status: "DONE",
      startDate: new Date("2026-06-15T00:00:00.000Z"),
      endDate: new Date("2026-06-15T00:00:00.000Z"),
      destinations: ["杭州"],
      coverUrl: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      summaryMd: null,
      budget: null,
      checklist: [],
      days: [
        {
          id: "day-1",
          date: new Date("2026-06-15T00:00:00.000Z"),
          noteMd: null,
          locations: [{ id: "legacy-1", name: "旧地点", lat: 30.25, lng: 120.14 }],
          locationItems: [],
          photos: [],
        },
      ],
    } as never);

    await expect(getTripDetail("trip-1")).resolves.toMatchObject({
      days: [
        {
          id: "day-1",
          locations: [],
        },
      ],
    });
  });
});
