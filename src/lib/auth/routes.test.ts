import { describe, expect, it } from "vitest";
import { isPublicPath, safeFromPath } from "./routes";

describe("isPublicPath", () => {
  it.each([
    "/login",
    "/",
    "/blog",
    "/blog/stage-1",
    "/nav",
    "/rss.xml",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/apple-touch-icon.png",
    "/uploads/a.jpg",
    "/uploads/posts/a.jpg",
    "/api/auth/session",
    "/api/health",
    "/api/posts/view",
    "/api/cron/steam-sync",
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

describe("safeFromPath", () => {
  it.each(["/todos", "/blog/stage-1", "/expenses?month=2026-06", "/"])(
    "keeps in-site absolute path %s",
    (path) => {
      expect(safeFromPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    "",
    "https://evil.com",
    "evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\/evil.com",
    "/path\\to\\evil",
    "/\t/evil.com",
    "/\n//evil.com",
  ])("rejects unsafe redirect target %j", (path) => {
    expect(safeFromPath(path as string | null)).toBe("/");
  });
});
