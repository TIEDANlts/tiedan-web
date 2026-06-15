import { describe, expect, it } from "vitest";

import { extractBearerToken, secureTokenEqual } from "./secure-compare";

describe("secureTokenEqual", () => {
  it("returns true only for identical tokens", () => {
    expect(secureTokenEqual("s3cret-token", "s3cret-token")).toBe(true);
    expect(secureTokenEqual("s3cret-token", "s3cret-tokeN")).toBe(false);
    expect(secureTokenEqual("s3cret-token", "s3cret-token-extra")).toBe(false);
    expect(secureTokenEqual("", "")).toBe(true);
    expect(secureTokenEqual("abc", "")).toBe(false);
  });
});

describe("extractBearerToken", () => {
  it("extracts the token after the Bearer prefix", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("Bearer   spaced  ")).toBe("spaced");
  });

  it("returns empty string for missing or malformed headers", () => {
    expect(extractBearerToken(null)).toBe("");
    expect(extractBearerToken(undefined)).toBe("");
    expect(extractBearerToken("")).toBe("");
    expect(extractBearerToken("Token abc")).toBe("");
    expect(extractBearerToken("bearer abc")).toBe("");
  });
});
