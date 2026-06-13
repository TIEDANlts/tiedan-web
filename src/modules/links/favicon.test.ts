import { describe, expect, it } from "vitest";

import { getFaviconCandidatesFromHtml } from "./favicon";

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
});
