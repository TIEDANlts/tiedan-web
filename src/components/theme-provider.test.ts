import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

describe("theme provider", () => {
  test("uses a local provider without next-themes script injection", () => {
    const provider = readFileSync(new URL("./theme-provider.tsx", import.meta.url), "utf8");
    const appShell = readFileSync(new URL("./app-shell.tsx", import.meta.url), "utf8");
    const sonner = readFileSync(new URL("./ui/sonner.tsx", import.meta.url), "utf8");

    expect(provider).not.toContain("next-themes");
    expect(provider).toContain("createContext");
    expect(appShell).not.toContain("next-themes");
    expect(sonner).not.toContain("next-themes");
  });
});
