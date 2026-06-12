import { describe, expect, it } from "vitest";
import { isPublicPath } from "./routes";

describe("isPublicPath", () => {
  it.each([
    "/login",
    "/",
    "/blog",
    "/blog/stage-1",
    "/nav",
    "/rss.xml",
    "/uploads/a.jpg",
    "/uploads/posts/a.jpg",
    "/api/auth/session",
    "/api/health",
    "/api/posts/view",
    "/api/quick/expense",
    "/_next/static/app.js",
    "/favicon.ico",
    "/file.svg",
  ])("allows public path %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/todos", "/admin/posts", "/api/upload", "/games", "/calendar", "/private/report.pdf"])(
    "protects private path %s",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});
