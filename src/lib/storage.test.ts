import { describe, expect, it } from "vitest";

import { extensionFromContentType, sanitizeStorageSubdir } from "./storage";

describe("extensionFromContentType", () => {
  it("maps image content types to stable extensions", () => {
    expect(extensionFromContentType("image/png")).toBe("png");
    expect(extensionFromContentType("image/jpeg; charset=binary")).toBe("jpg");
    expect(extensionFromContentType("image/svg+xml")).toBeNull();
  });
});

describe("sanitizeStorageSubdir", () => {
  it("keeps uploads inside a safe relative subdir", () => {
    expect(sanitizeStorageSubdir("favicons")).toBe("favicons");
    expect(sanitizeStorageSubdir("../private")).toBe("private");
    expect(sanitizeStorageSubdir("icons/site logos")).toBe("icons/site-logos");
  });
});
