import { describe, expect, it } from "vitest";

import {
  derivePrivateThumbUrl,
  enumerateTripDates,
  normalizeTripInput,
  planTripDaySync,
  parseTripLocations,
  readTripFormData,
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

describe("planTripDaySync", () => {
  it("keeps in-range days, creates missing dates, and deletes days outside the new range", () => {
    expect(
      planTripDaySync(
        [
          { id: "day-1", date: new Date("2026-06-01T00:00:00.000Z") },
          { id: "day-2", date: new Date("2026-06-02T00:00:00.000Z") },
          { id: "day-3", date: new Date("2026-06-03T00:00:00.000Z") },
        ],
        ["2026-06-02", "2026-06-03", "2026-06-04"],
      ),
    ).toEqual({
      createDates: ["2026-06-04"],
      deleteIds: ["day-1"],
    });
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

  it("rejects normalized invalid trip dates", () => {
    const result = normalizeTripInput({
      title: "Invalid dates",
      startDate: "2026-02-31",
      endDate: "2026-13-01",
      destinations: "Hangzhou",
      status: "PLANNED",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.errors.startDate).toBeTruthy();
    expect(result.ok ? null : result.errors.endDate).toBeTruthy();
  });

  it("accepts leap-day trip dates", () => {
    const result = normalizeTripInput({
      title: "Leap day",
      startDate: "2024-02-29",
      endDate: "2024-02-29",
      destinations: "Hangzhou",
      status: "PLANNED",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        startDate: new Date("2024-02-29T00:00:00.000Z"),
        endDate: new Date("2024-02-29T00:00:00.000Z"),
      },
    });
  });

  it("rejects budgets beyond Decimal(12,2)", () => {
    const result = normalizeTripInput({
      title: "预算过大",
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      destinations: "杭州",
      status: "PLANNED",
      budget: "10000000000.00",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        budget: "预算不能超过 9,999,999,999.99。",
      },
    });
  });
});

describe("readTripFormData", () => {
  it("reads FormData and keeps summary optional", () => {
    const formData = new FormData();
    formData.set("title", "  Hangzhou ");
    formData.set("startDate", "2026-06-15");
    formData.set("endDate", "2026-06-17");
    formData.set("destinations", "Hangzhou, West Lake, Hangzhou,,");
    formData.set("coverUrl", "/uploads/trips/covers/a.webp");
    formData.set("status", "DONE");
    formData.set("summaryMd", " Trip notes ");
    formData.set("budget", "1200.50");

    const result = readTripFormData(formData, { includeSummary: true });

    expect(result).toMatchObject({
      ok: true,
      data: {
        title: "Hangzhou",
        startDate: new Date("2026-06-15T00:00:00.000Z"),
        endDate: new Date("2026-06-17T00:00:00.000Z"),
        destinations: ["Hangzhou", "West Lake"],
        coverUrl: "/uploads/trips/covers/a.webp",
        status: "DONE",
        summaryMd: "Trip notes",
      },
    });
    expect(result.ok && result.data.budget?.toFixed(2)).toBe("1200.50");
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
