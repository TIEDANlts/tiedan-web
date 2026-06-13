import { describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "../../lib/http";

import { fetchAndCacheFavicon, getFaviconCandidatesFromHtml } from "./favicon";

vi.mock("../../lib/http", () => ({
  fetchWithRetry: vi.fn(),
}));

describe("getFaviconCandidatesFromHtml", () => {
  it("prefers icon link tags and resolves relative hrefs", () => {
    const candidates = getFaviconCandidatesFromHtml(
      `
        <html>
          <head>
            <link rel="apple-touch-icon" href="/apple.png">
            <link rel="shortcut icon" href="favicon.ico">
            <link rel="stylesheet" href="/app.css">
          </head>
        </html>
      `,
      "https://example.com/docs/page",
    );

    expect(candidates).toEqual([
      "https://example.com/apple.png",
      "https://example.com/docs/favicon.ico",
      "https://example.com/favicon.ico",
    ]);
  });

  it("falls back to origin favicon when no icon link exists", () => {
    expect(getFaviconCandidatesFromHtml("<html></html>", "https://example.com/a")).toEqual([
      "https://example.com/favicon.ico",
    ]);
  });

  it("returns the url from the storage save result", async () => {
    const save = vi.fn(async () => ({ url: "/uploads/favicons/a.webp", thumbUrl: "/uploads/favicons/a-thumb.webp" }));
    const mockedFetchWithRetry = vi.mocked(fetchWithRetry);

    mockedFetchWithRetry.mockResolvedValue(new Response("<html></html>", { status: 200 }));

    await expect(fetchAndCacheFavicon("https://example.com", save)).resolves.toBe("/uploads/favicons/a.webp");
    expect(save).toHaveBeenCalledWith("https://example.com/favicon.ico", "favicons");
  });
});
