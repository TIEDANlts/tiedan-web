import { describe, expect, it } from "vitest";

import { isThemeOptionActive } from "./app-shell-utils";

describe("isThemeOptionActive", () => {
  it("does not mark a theme option active before the client has mounted", () => {
    expect(isThemeOptionActive(false, "system", "system")).toBe(false);
  });

  it("marks the current theme active after the client has mounted", () => {
    expect(isThemeOptionActive(true, "system", "system")).toBe(true);
    expect(isThemeOptionActive(true, "dark", "system")).toBe(false);
  });
});
