import { expect, test } from "@playwright/test";

import { cleanupE2eData, seedE2eData } from "./support/db";
import { attachDiagnostics, capturePage, expectNoBrokenImages, expectNoErrorOverlay } from "./support/diagnostics";
import { uniquePrefix } from "./support/fixtures";

test("显示健康全量扫：公开页、私有页、桌面/移动截图、错误与破图", async ({ page }, testInfo) => {
  const prefix = uniquePrefix(testInfo);
  const seed = seedE2eData(prefix);
  const diagnostics = attachDiagnostics(page);
  const pages = [
    { path: "/", heading: "今天的收藏册快照", name: "home-dashboard" },
    { path: "/login", heading: "登录", name: "login" },
    { path: "/blog", heading: "写下来的日常和想法。", name: "blog" },
    { path: "/blog/page/2", heading: `${prefix} 文章 11`, name: "blog-page-2" },
    { path: `/blog/${seed.postSlug}`, heading: `${prefix} 文章 01`, name: "blog-detail" },
    { path: "/nav", heading: "常去的地方，收在一页。", name: "nav" },
    { path: "/todos", heading: "今天先做哪几件事", name: "todos" },
    { path: "/admin/links", heading: "管理公开导航", name: "admin-links" },
    { path: "/admin/posts", heading: "写作与发布", name: "admin-posts" },
    { path: "/admin/posts/new", heading: "新建文章", name: "admin-posts-new" },
    { path: "/expenses", heading: "消费流水", name: "expenses" },
    { path: "/expenses/stats", heading: "消费分析", name: "expenses-stats" },
    { path: "/expenses/import", heading: "导入微信 / 支付宝账单", name: "expenses-import" },
    { path: "/expenses/import/history", heading: "导入历史", name: "expenses-import-history" },
    { path: "/admin/expense-categories", heading: "管理消费分类", name: "admin-expense-categories" },
    { path: "/media", heading: "书影收藏册", name: "media" },
    { path: `/media/${seed.mediaId}`, heading: `${prefix} 书影条目`, name: "media-detail" },
    { path: "/media/import", heading: "导入豆瓣历史标记", name: "media-import" },
    { path: "/games", heading: "游戏收藏册", name: "games" },
    { path: "/trips", heading: "旅行收藏册", name: "trips" },
    { path: `/trips/${seed.tripId}`, heading: `${prefix} 杭州行程`, name: "trip-detail" },
    { path: "/trips/footprint", heading: "走过的地方", name: "trips-footprint" },
    { path: "/calendar", heading: "全局日历", name: "calendar" },
    { path: "/admin/settings", heading: "站点资料与数据", name: "admin-settings" },
  ];

  try {
    for (const target of pages) {
      await test.step(target.name, async () => {
        await page.goto(target.path);
        await expect.soft(page.getByText(target.heading).first(), `${target.path} 关键文案可见`).toBeVisible({ timeout: 20_000 });
        await expectNoErrorOverlay(page);
        await expectNoBrokenImages(page);
        await capturePage(page, testInfo, `display-${target.name}`);
      });
    }

    await test.step("明暗主题切换", async () => {
      await page.goto("/todos");
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await capturePage(page, testInfo, "display-theme-dark");
      await page.evaluate(() => document.documentElement.classList.remove("dark"));
      await capturePage(page, testInfo, "display-theme-light");
    });

    expect.soft(diagnostics.consoleErrors, "显示扫 console.error").toEqual([]);
    expect.soft(diagnostics.pageErrors, "显示扫 pageerror").toEqual([]);
    expect.soft(diagnostics.failedRequests, "显示扫失败请求").toEqual([]);
    expect.soft(diagnostics.badResponses, "显示扫 4xx/5xx").toEqual([]);
  } finally {
    cleanupE2eData(prefix);
  }
});
