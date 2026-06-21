import { expect, type Page, type TestInfo, test } from "@playwright/test";

import { cleanupE2eData, seedE2eData, type SeedResult } from "./support/db";
import { attachDiagnostics, capturePage, expectNoBrokenImages, expectNoErrorOverlay } from "./support/diagnostics";
import { uniquePrefix, writeExpenseCsv, writeMediaCsv, writeTinyPng } from "./support/fixtures";

type ScenarioContext = {
  page: Page;
  testInfo: TestInfo;
  prefix: string;
  seed: SeedResult;
};

async function runSeededScenario(
  page: Page,
  testInfo: TestInfo,
  name: string,
  body: (context: ScenarioContext) => Promise<void>,
) {
  const prefix = uniquePrefix(testInfo);
  const seed = seedE2eData(prefix);
  const diagnostics = attachDiagnostics(page);
  testInfo.annotations.push({ type: "e2e-prefix", description: prefix });

  try {
    await body({ page, testInfo, prefix, seed });
    await expectNoErrorOverlay(page);
    expect.soft(diagnostics.consoleErrors, `${name} console.error`).toEqual([]);
    expect.soft(diagnostics.pageErrors, `${name} pageerror`).toEqual([]);
    expect.soft(diagnostics.failedRequests, `${name} 失败请求`).toEqual([]);
    expect.soft(diagnostics.badResponses, `${name} 4xx/5xx`).toEqual([]);
  } catch (error) {
    await capturePage(page, testInfo, `failure-${name}`).catch(() => undefined);
    throw error;
  } finally {
    cleanupE2eData(prefix);
  }
}

test("导入：消费账单 CSV 解析、预览、确认、历史", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "expense-import", async ({ page, testInfo, prefix }) => {
    await page.goto("/expenses/import");
    await expect(page.getByRole("heading", { name: "导入微信 / 支付宝账单" })).toBeVisible();
    await page.locator("input[type=file]").setInputFiles(writeExpenseCsv(testInfo, prefix));
    await expect(page.locator("input[type=file]")).toHaveJSProperty("files.length", 1);
    await page.getByRole("button", { name: "解析文件" }).click();
    await expect(page.getByRole("heading", { name: "确认平台" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "生成预览" }).click();
    await expect(page.getByRole("heading", { name: "预览导入" })).toBeVisible();
    await expect(page.getByText(/将导入 2/)).toBeVisible();
    await page.getByRole("button", { name: "确认导入" }).click();
    await expect(page).toHaveURL(/\/expenses\/import\/result\/[^/]+$/);
    await expect(page.getByText(/成功|导入/)).toBeVisible();
    await page.goto("/expenses/import/history");
    await expect(page.getByText(prefix)).toBeVisible();
    await capturePage(page, testInfo, "imports-expenses");
  });
});

test("导入：书影 CSV 映射、预览、执行", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "media-import", async ({ page, testInfo, prefix }) => {
    await page.goto("/media/import");
    await expect(page.getByRole("heading", { name: "导入豆瓣历史标记" })).toBeVisible();
    await page.locator("input[type=file]").setInputFiles(writeMediaCsv(testInfo, prefix));
    await expect(page.locator("input[type=file]")).toHaveJSProperty("files.length", 1);
    await page.getByRole("button", { name: "解析文件" }).click();
    await expect(page.getByRole("heading", { name: "确认列映射" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "生成预览" }).click();
    await expect(page.getByText(`${prefix} CSV 媒体`)).toBeVisible();
    await page.getByRole("button", { name: "执行导入" }).click();
    await expect(page.getByRole("heading", { name: "导入完成" })).toBeVisible();
    await page.goto("/media");
    await expect(page.getByText(`${prefix} CSV 媒体`)).toBeVisible();
    await capturePage(page, testInfo, "imports-media");
  });
});

test("上传：书影详情封面上传并保存", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "media-cover-upload", async ({ page, testInfo, prefix, seed }) => {
    await page.goto(`/media/${seed.mediaId}`);
    await expect(page.getByRole("heading", { name: `${prefix} 书影条目` })).toBeVisible();
    await page.locator("input[type=file]").first().setInputFiles(writeTinyPng(testInfo, "media-cover.png"));
    await expect(page.getByRole("textbox", { name: "封面" })).toHaveValue(/\/uploads\/media\//, { timeout: 15_000 });
    await page.getByRole("button", { name: "保存书影条目" }).click();
    await expect(page.getByText(/书影条目已保存|已保存/)).toBeVisible();
    await capturePage(page, testInfo, "imports-media-detail-cover");
  });
});

test("外部依赖：游戏库与 Steam 空 key 降级", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "games-steam", async ({ page, testInfo, prefix }) => {
    await page.goto("/games");
    await expect(page.getByRole("heading", { name: "游戏收藏册" })).toBeVisible();
    await page.getByPlaceholder("搜索游戏名").fill(`${prefix} 游戏条目`);
    await expect(page.getByText(`${prefix} 游戏条目`)).toBeVisible();

    await page.getByRole("button", { name: "添加游戏" }).click();
    const gameDialog = page.getByRole("dialog");
    await expect.soft(gameDialog, "添加游戏按钮应打开新增游戏弹窗").toBeVisible({ timeout: 5_000 });
    if (await gameDialog.isVisible().catch(() => false)) {
      await gameDialog.getByLabel("名称").fill(`${prefix} UI 游戏`);
      await gameDialog.getByLabel("平台").fill("PC");
      await gameDialog.getByLabel("已玩时长（小时）").fill("2.5");
      await gameDialog.getByRole("button", { name: "保存" }).click();
      await page.getByPlaceholder("搜索游戏名").fill(`${prefix} UI 游戏`);
      await expect(page.getByText(`${prefix} UI 游戏`)).toBeVisible();
    }

    if (!process.env.STEAM_API_KEY || !process.env.STEAM_ID) {
      await page.getByRole("button", { name: "同步 Steam" }).click();
      await expect(page.getByText(/缺少 STEAM_API_KEY|无法同步 Steam|Steam/)).toBeVisible();
    } else {
      testInfo.annotations.push({
        type: "blocked",
        description: "STEAM_API_KEY/STEAM_ID 存在，为避免真实请求 Steam，上游成功路径未自动执行。",
      });
    }

    await expectNoBrokenImages(page);
    await capturePage(page, testInfo, "imports-games-steam");
  });
});

test("外部依赖：旅行地点 mock 地理编码、详情地图与照片上传", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "trip-location-photo-map", async ({ page, testInfo, prefix, seed }) => {
    await page.route("**/api/trips/nominatim?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [{ name: `${prefix} Mock 西湖`, lat: 30.259244, lng: 120.137595 }],
        }),
      });
    });

    try {
      await page.goto(`/trips/${seed.tripId}`);
      await expect(page.getByRole("link", { name: /返回旅行列表/ })).toBeVisible();
      await expect(page.locator(".leaflet-container").first()).toBeVisible({ timeout: 20_000 });
      await page.getByPlaceholder("搜索地点，例如 西湖").first().fill("西湖");
      await page.getByRole("button", { name: "搜索" }).first().click();
      await page.getByText(`${prefix} Mock 西湖`).click();
      await page.getByRole("button", { name: "添加地点" }).first().click();
      await expect(page.getByText(`${prefix} Mock 西湖`)).toBeVisible();
      await page.locator("input[type=file]").first().setInputFiles(writeTinyPng(testInfo, "trip-photo.png"));
      await expect(page.getByText(/照片已添加|上传|保存/)).toBeVisible({ timeout: 15_000 });
      await capturePage(page, testInfo, "imports-trip-detail");
    } finally {
      await page.unroute("**/api/trips/nominatim?**").catch(() => undefined);
    }
  });
});

test("地图：旅行足迹 Leaflet 容器渲染", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "trip-footprint", async ({ page, testInfo }) => {
    await page.goto("/trips/footprint");
    await expect(page.getByRole("heading", { name: "走过的地方" })).toBeVisible();
    await expect(page.locator(".leaflet-container").first()).toBeVisible({ timeout: 20_000 });
    await capturePage(page, testInfo, "imports-trip-footprint");
  });
});

test("日历：跨模块聚合事件显示", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "calendar-aggregation", async ({ page, testInfo, prefix }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "全局日历" })).toBeVisible();
    await expect(page.locator(".fc")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(`${prefix} 纪念日`).or(page.getByText(`${prefix} 今日待办`))).toBeVisible();
    await capturePage(page, testInfo, "imports-calendar-aggregation");
  });
});
