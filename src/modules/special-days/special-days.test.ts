import { describe, expect, it } from "vitest";

import { moduleColors } from "../../lib/design";
import { expandSpecialDayEvents } from "./events";

const baseSpecialDay = {
  icon: null,
  note: null,
};

describe("expandSpecialDayEvents", () => {
  it("expands yearly events across a December to January query range", () => {
    const events = expandSpecialDayEvents(
      [
        {
          ...baseSpecialDay,
          id: "december",
          title: "年末纪念日",
          date: new Date("2000-12-30T00:00:00.000Z"),
          yearlyRepeat: true,
        },
        {
          ...baseSpecialDay,
          id: "january",
          title: "新年纪念日",
          date: new Date("2000-01-03T00:00:00.000Z"),
          yearlyRepeat: true,
        },
      ],
      "2026-12-01",
      "2027-02-01",
    );

    expect(events.map((event) => event.start)).toEqual(["2026-12-30", "2027-01-03"]);
    expect(events.map((event) => event.href)).toEqual([
      "/calendar?date=2026-12-30",
      "/calendar?date=2027-01-03",
    ]);
    expect(events.every((event) => event.allDay && event.color === moduleColors.specialDays)).toBe(true);
  });

  it("moves a February 29 yearly event to February 28 in common years", () => {
    const events = expandSpecialDayEvents(
      [
        {
          ...baseSpecialDay,
          id: "leap-birthday",
          title: "闰日生日",
          date: new Date("2000-02-29T00:00:00.000Z"),
          yearlyRepeat: true,
        },
      ],
      "2025-02-01",
      "2025-03-01",
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "specialDays:leap-birthday:2025-02-28",
      title: "闰日生日",
      start: "2025-02-28",
    });
  });

  it("keeps a February 29 yearly event on February 29 in leap years", () => {
    const events = expandSpecialDayEvents(
      [
        {
          ...baseSpecialDay,
          id: "leap-birthday",
          title: "闰日生日",
          date: new Date("2000-02-29T00:00:00.000Z"),
          yearlyRepeat: true,
        },
      ],
      "2024-02-01",
      "2024-03-01",
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.start).toBe("2024-02-29");
  });

  it("includes a one-time event only once when its original date is in range", () => {
    const events = expandSpecialDayEvents(
      [
        {
          ...baseSpecialDay,
          id: "once",
          title: "只发生一次",
          date: new Date("2026-12-31T00:00:00.000Z"),
          yearlyRepeat: false,
        },
      ],
      "2026-12-01",
      "2028-01-01",
    );

    expect(events.map((event) => event.start)).toEqual(["2026-12-31"]);
  });
});
