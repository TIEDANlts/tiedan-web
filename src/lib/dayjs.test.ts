import { describe, expect, it } from "vitest";

import { formatShanghaiDate, formatShanghaiDateTime, SHANGHAI_TIMEZONE } from "./dayjs";

describe("dayjs Shanghai helpers", () => {
  it("formats UTC input in Asia/Shanghai time", () => {
    expect(SHANGHAI_TIMEZONE).toBe("Asia/Shanghai");
    expect(formatShanghaiDateTime("2026-06-12T00:30:00Z")).toBe("2026-06-12 08:30");
  });

  it("uses Shanghai calendar dates instead of UTC date slices", () => {
    expect(formatShanghaiDate("2026-06-11T16:00:00Z")).toBe("2026-06-12");
  });
});
