import { expect, type Page, type TestInfo, test } from "@playwright/test";

import { cleanupE2eData, seedE2eData, type SeedResult } from "./support/db";
import { attachDiagnostics, capturePage, expectNoBrokenImages, expectNoErrorOverlay } from "./support/diagnostics";
import { uniquePrefix } from "./support/fixtures";

type ScenarioContext = {
  page: Page;
  request?: import("@playwright/test").APIRequestContext;
  testInfo: TestInfo;
  prefix: string;
  seed: SeedResult;
};

async function runSeededScenario(
  page: Page,
  testInfo: TestInfo,
  name: string,
  body: (context: ScenarioContext) => Promise<void>,
  request?: import("@playwright/test").APIRequestContext,
) {
  const prefix = uniquePrefix(testInfo);
  const seed = seedE2eData(prefix);
  const diagnostics = attachDiagnostics(page);
  testInfo.annotations.push({ type: "e2e-prefix", description: prefix });

  try {
    await body({ page, request, testInfo, prefix, seed });
    await expectNoErrorOverlay(page);
    await expectNoBrokenImages(page);
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

async function confirmDelete(page: Page, testInfo: TestInfo, name: string) {
  const dialogDelete = page.getByRole("dialog").getByRole("button", { name: "删除" });
  await expect.soft(dialogDelete, `${name} 应弹出删除确认对话框`).toBeVisible({ timeout: 5_000 });
  if (await dialogDelete.isVisible().catch(() => false)) {
    await dialogDelete.click();
  } else {
    await capturePage(page, testInfo, `failure-${name}-delete-dialog`);
  }
}

test("私有：dashboard 聚合卡片显示", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "private-dashboard", async ({ page, testInfo }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "今天的收藏册快照" })).toBeVisible();
    await capturePage(page, testInfo, "private-dashboard");
  });
});

test("私有：todos 新建、完成、删除、拖拽控件检查", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "private-todos", async ({ page, testInfo, prefix }) => {
    await page.goto("/todos");
    await expect(page.getByRole("heading", { name: "今天先做哪几件事" })).toBeVisible();
    await page.getByPlaceholder("输入待办，回车添加").fill(`${prefix} UI 新建待办`);
    await page.getByRole("button", { name: "添加" }).click();
    await expect(page.getByText(`${prefix} UI 新建待办`)).toBeVisible();
    const todoRow = page
      .getByText(`${prefix} UI 新建待办`, { exact: true })
      .last()
      .locator("xpath=ancestor::div[contains(@class,'grid') and contains(@class,'p-3')][1]");
    await todoRow.getByRole("button", { name: "标记完成" }).first().click();
    await expect(page.getByText(`${prefix} UI 新建待办`)).toBeVisible();
    await todoRow.getByRole("button", { name: "删除待办" }).first().click();
    await confirmDelete(page, testInfo, "todos");
    await expect.soft(page.getByText(`${prefix} UI 新建待办`), "删除待办后新建项应消失").toHaveCount(0, { timeout: 5_000 });
    await expect.soft(page.getByLabel(/拖拽排序/), "todos 当前缺少拖拽重排控件，无法验证持久化排序").toHaveCount(1);
    await capturePage(page, testInfo, "private-todos");
  });
});

test("私有：links 后台新增并同步公开导航", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "private-links", async ({ page, testInfo, prefix }) => {
    await page.goto("/admin/links");
    await expect(page.getByRole("heading", { name: "管理公开导航" })).toBeVisible();
    await page.getByRole("button", { name: "新增链接" }).click();
    const linkDialog = page.getByRole("dialog");
    await expect(linkDialog, "新增链接应打开编辑弹窗").toBeVisible({ timeout: 10_000 });
    await linkDialog.getByLabel("分组").fill(`${prefix} UI 分组`);
    await linkDialog.getByLabel("标题").fill(`${prefix} UI 链接`);
    await linkDialog.getByLabel("URL").fill("https://example.com/ui");
    await linkDialog.getByLabel("图标").fill("/favicon.ico");
    await linkDialog.getByLabel("描述").fill("E2E UI created link");
    await linkDialog.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText(`${prefix} UI 链接`)).toBeVisible();
    await page.goto("/nav");
    await expect(page.getByText(`${prefix} UI 链接`)).toBeVisible();
    await capturePage(page, testInfo, "private-links-public-sync");
  });
});

test("私有：posts 新建发布并公开渲染 Markdown", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "private-posts", async ({ page, testInfo, prefix, seed }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("标题").fill(`${prefix} UI 发布文章`);
    await page.getByLabel("Slug").fill(`${seed.slugBase}-ui-post`);
    await page.getByLabel("摘要").fill("UI created summary");
    await page.locator("textarea[placeholder='写点什么，支持 Markdown。']").fill("## UI Markdown\n\n```ts\nconsole.log('ok')\n```");
    await page.getByLabel("分类").fill("E2E");
    await page.getByRole("button", { name: "发布" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[^/]+$/);
    await page.goto(`/blog/${seed.slugBase}-ui-post`);
    await expect(page.getByRole("heading", { name: `${prefix} UI 发布文章` })).toBeVisible();
    await expect(page.locator("pre code").first()).toBeVisible();
    await capturePage(page, testInfo, "private-posts-published");
  });
});

test("私有：expenses 手动记账、过滤、统计", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "private-expenses", async ({ page, testInfo, prefix }) => {
    await page.goto("/expenses");
    await expect(page.getByRole("heading", { name: "消费流水" })).toBeVisible();
    await page.getByRole("button", { name: "记一笔" }).first().click();
    const expenseDialog = page.getByRole("dialog");
    await expect(expenseDialog, "记一笔应打开弹窗").toBeVisible({ timeout: 10_000 });
    await expenseDialog.getByLabel("金额").fill("33.30");
    await expenseDialog.getByLabel("商户").fill(`${prefix} UI 商户`);
    await expenseDialog.getByLabel("备注").fill("UI 手动记账");
    await expenseDialog.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText(`${prefix} UI 商户`)).toBeVisible();
    await page.getByPlaceholder("搜索商户、商品或备注").fill(`${prefix} UI 商户`);
    await page.keyboard.press("Enter");
    await expect(page.getByText(`${prefix} UI 商户`)).toBeVisible();
    await page.goto("/expenses/stats");
    await expect(page.getByRole("heading", { name: "消费分析" })).toBeVisible();
    await expect(page.locator("canvas, svg").first()).toBeVisible();
    await capturePage(page, testInfo, "private-expenses-stats");
  });
});

test("私有：admin expense categories 新增分类", async ({ page }, testInfo) => {
  await runSeededScenario(page, testInfo, "private-expense-categories", async ({ page, testInfo, prefix }) => {
    await page.goto("/admin/expense-categories");
    await expect(page.getByRole("heading", { name: "管理消费分类" })).toBeVisible();
    await page.getByRole("button", { name: "新增分类" }).click();
    const categoryDialog = page.getByRole("dialog");
    await expect(categoryDialog, "新增分类应打开弹窗").toBeVisible({ timeout: 10_000 });
    await categoryDialog.getByLabel("名称").fill(`${prefix} 分类`);
    await categoryDialog.getByLabel("图标").fill("*");
    await categoryDialog.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText(`${prefix} 分类`)).toBeVisible();
    await capturePage(page, testInfo, "private-expense-categories");
  });
});

test("私有：calendar、settings 与 admin export", async ({ page, request }, testInfo) => {
  await runSeededScenario(
    page,
    testInfo,
    "private-calendar-settings-export",
    async ({ page, request, testInfo, prefix }) => {
      await page.goto("/calendar");
      await expect(page.getByRole("heading", { name: "全局日历" })).toBeVisible();
      await expect.soft(page.getByText(`${prefix} 纪念日`).or(page.getByText(`${prefix} 今日待办`)), "日历应显示跨模块聚合事件").toBeVisible({
        timeout: 20_000,
      });
      await capturePage(page, testInfo, "private-calendar");

      await page.goto("/admin/settings");
      await page.getByLabel("名字").fill(`${prefix} 保存设置`);
      await page.getByLabel("一句话简介").fill("E2E 保存后的简介");
      await page.getByRole("button", { name: "保存首页资料" }).click();
      await expect(page.getByText("首页资料已保存。")).toBeVisible();
      await page.goto("/");
      await expect(page.getByText(`${prefix} 保存设置`)).toBeVisible();
      const exportResponse = await request!.get("/api/admin/export");
      expect.soft(exportResponse.status(), "admin export 应可下载").toBe(200);
      await capturePage(page, testInfo, "private-settings-dashboard");
    },
    request,
  );
});
