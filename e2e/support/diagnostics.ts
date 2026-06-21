import { expect, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export type PageDiagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
};

const ignoredRequestPatterns = [/hmr/i, /_next\/webpack-hmr/i, /tile\.openstreetmap/i, /tianditu/i];
const ignoredConsolePatterns = [/webpack-hmr/i, /WebSocket connection to .*_next\/webpack-hmr/i];

export function attachDiagnostics(page: Page): PageDiagnostics {
  const diagnostics: PageDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error" && !ignoredConsolePatterns.some((pattern) => pattern.test(message.text()))) {
      diagnostics.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!ignoredRequestPatterns.some((pattern) => pattern.test(url))) {
      diagnostics.failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText ?? "failed"}`);
    }
  });
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !ignoredRequestPatterns.some((pattern) => pattern.test(url))) {
      diagnostics.badResponses.push(`${response.status()} ${url}`);
    }
  });

  return diagnostics;
}

export function screenshotPath(testInfo: TestInfo, name: string) {
  const safeName = name.replace(/[^a-z0-9\u4e00-\u9fa5-]+/gi, "-").replace(/-+/g, "-");
  const directory = path.join(process.cwd(), "test-results", "e2e-screenshots", testInfo.project.name);
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, `${safeName}.png`);
}

export async function capturePage(page: Page, testInfo: TestInfo, name: string) {
  const filePath = screenshotPath(testInfo, name);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(`${name}.png`, { path: filePath, contentType: "image/png" });
  return filePath;
}

export async function expectNoBrokenImages(page: Page) {
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .map((image) => {
        const element = image as HTMLImageElement;
        return { src: element.currentSrc || element.src, width: element.naturalWidth };
      })
      .filter((image) => image.src && image.width === 0)
      .map((image) => image.src),
  );

  expect.soft(brokenImages, "页面不应出现破图").toEqual([]);
}

export async function expectNoErrorOverlay(page: Page) {
  await expect.soft(page.getByText(/Application error|Unhandled Runtime Error|Hydration failed/i)).toHaveCount(0);
}

export function assertDiagnosticsClean(diagnostics: PageDiagnostics) {
  expect.soft(diagnostics.consoleErrors, "console.error 应为空").toEqual([]);
  expect.soft(diagnostics.pageErrors, "pageerror 应为空").toEqual([]);
  expect.soft(diagnostics.failedRequests, "失败请求应为空").toEqual([]);
  expect.soft(diagnostics.badResponses, "4xx/5xx 响应应为空").toEqual([]);
}

export async function checkedGoto(page: Page, testInfo: TestInfo, pathName: string, screenshotName: string) {
  const diagnostics = attachDiagnostics(page);
  await page.goto(pathName);
  await expectNoErrorOverlay(page);
  await expectNoBrokenImages(page);
  await capturePage(page, testInfo, screenshotName);
  assertDiagnosticsClean(diagnostics);
}
