import { describe, expect, it } from "vitest";

import { formatShanghaiDate, formatShanghaiDateTime, parseStrictShanghaiDate, SHANGHAI_TIMEZONE } from "./dayjs";

describe("dayjs Shanghai helpers", () => {
  it("formats UTC input in Asia/Shanghai time", () => {
    expect(SHANGHAI_TIMEZONE).toBe("Asia/Shanghai");
    expect(formatShanghaiDateTime("2026-06-12T00:30:00Z")).toBe("2026-06-12 08:30");
  });

  it("uses Shanghai calendar dates instead of UTC date slices", () => {
    expect(formatShanghaiDate("2026-06-11T16:00:00Z")).toBe("2026-06-12");
  });

  it("strictly parses valid Shanghai date text to the db date sentinel", () => {
    expect(parseStrictShanghaiDate("2024-02-29")).toEqual(new Date("2024-02-29T00:00:00.000Z"));
  });

  it("rejects normalized invalid date text", () => {
    expect(parseStrictShanghaiDate("2026-02-31")).toBeNull();
    expect(parseStrictShanghaiDate("2026-13-01")).toBeNull();
    expect(parseStrictShanghaiDate("2026-2-3")).toBeNull();
  });
});
