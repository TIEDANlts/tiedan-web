import { describe, expect, it } from "vitest";

import { getRatingStars } from "./rating";

describe("getRatingStars", () => {
  it.each([
    [0, ["empty", "empty", "empty", "empty", "empty"]],
    [1, ["half", "empty", "empty", "empty", "empty"]],
    [5, ["full", "full", "half", "empty", "empty"]],
    [9, ["full", "full", "full", "full", "half"]],
    [10, ["full", "full", "full", "full", "full"]],
  ] as const)("maps %i/10 to five-star half steps", (score, expected) => {
    expect(getRatingStars(score)).toEqual(expected);
  });

  it("clamps values outside the 0-10 range", () => {
    expect(getRatingStars(-3)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
    expect(getRatingStars(14)).toEqual(["full", "full", "full", "full", "full"]);
  });
});
