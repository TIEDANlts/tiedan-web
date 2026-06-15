import { describe, expect, it } from "vitest";

import { gcj02ToWgs84, isOutsideChina } from "./geo";

describe("isOutsideChina", () => {
  it("keeps overseas coordinates unchanged", () => {
    expect(isOutsideChina(40.7128, -74.006)).toBe(true);
    expect(gcj02ToWgs84(40.7128, -74.006)).toEqual({ lat: 40.7128, lng: -74.006 });
  });
});

describe("gcj02ToWgs84", () => {
  it("converts domestic GCJ-02 coordinates back near WGS-84", () => {
    const converted = gcj02ToWgs84(39.908823, 116.39747);

    expect(converted.lat).toBeCloseTo(39.9074, 3);
    expect(converted.lng).toBeCloseTo(116.3912, 3);
  });
});
