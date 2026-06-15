import { describe, expect, it } from "vitest";

import {
  derivePrivateThumbUrl,
  enumerateTripDates,
  normalizeTripInput,
  parseTripLocations,
  tripDaysCount,
} from "./utils";

describe("enumerateTripDates", () => {
  it("generates every date in an inclusive range", () => {
    expect(enumerateTripDates("2026-06-15", "2026-06-17")).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
    ]);
  });
});

describe("tripDaysCount", () => {
  it("counts inclusive trip days", () => {
    expect(tripDaysCount("2026-06-15", "2026-06-15")).toBe(1);
    expect(tripDaysCount("2026-06-15", "2026-06-17")).toBe(3);
  });
});

describe("normalizeTripInput", () => {
  it("accepts valid trip input and deduplicates destinations", () => {
    const result = normalizeTripInput({
      title: "杭州三日",
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      destinations: "杭州, 西湖,杭州",
      status: "PLANNED",
      budget: "1200.50",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        title: "杭州三日",
        startDate: new Date("2026-06-15T00:00:00.000Z"),
        endDate: new Date("2026-06-17T00:00:00.000Z"),
        destinations: ["杭州", "西湖"],
        coverUrl: null,
        status: "PLANNED",
        summaryMd: null,
        budget: expect.anything(),
      },
    });
  });

  it("rejects an end date before the start date", () => {
    const result = normalizeTripInput({
      title: "反向日期",
      startDate: "2026-06-17",
      endDate: "2026-06-15",
      destinations: "杭州",
      status: "PLANNED",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errors.endDate).toBe("结束日期不能早于开始日期。");
  });
});

describe("parseTripLocations", () => {
  it("normalizes persisted location JSON", () => {
    expect(parseTripLocations([{ name: "西湖", lat: 30.25, lng: 120.14 }])).toEqual([
      expect.objectContaining({ name: "西湖", lat: 30.25, lng: 120.14 }),
    ]);
  });

  it("drops invalid coordinates", () => {
    expect(parseTripLocations([{ name: "坏坐标", lat: "x", lng: 120 }])).toEqual([]);
  });
});

describe("derivePrivateThumbUrl", () => {
  it("derives thumbnail URL from a private original URL", () => {
    expect(derivePrivateThumbUrl("/api/files/private/trips/a.webp")).toBe("/api/files/private/trips/a-thumb.webp");
    expect(derivePrivateThumbUrl("/api/files/private/trips/a.jpg")).toBe("/api/files/private/trips/a-thumb.jpg");
  });
});
