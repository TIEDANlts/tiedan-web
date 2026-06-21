import { expect, test } from "@playwright/test";

import { cleanupE2eData, seedE2eData } from "./support/db";
import { attachDiagnostics, capturePage, expectNoBrokenImages, expectNoErrorOverlay } from "./support/diagnostics";
import { uniquePrefix } from "./support/fixtures";

test("公开区：登录门禁、博客、分页、详情、RSS、导航", async ({ browser, page, request }, testInfo) => {
  const prefix = uniquePrefix(testInfo);
  const seed = seedE2eData(prefix);
  testInfo.annotations.push({ type: "e2e-prefix", description: prefix });

  try {
    const anonContext = await browser.newContext({
      baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
      storageState: { cookies: [], origins: [] },
    });
    const anonPage = await anonContext.newPage();

    await anonPage.goto("/login?from=/todos");
    await anonPage.getByLabel("用户名").fill(process.env.ADMIN_USERNAME ?? "");
    await anonPage.getByLabel("密码").fill("wrong-password");
    await anonPage.getByRole("button", { name: "登录" }).click();
    await expect(anonPage).toHaveURL(/\/login/);
    await expect.soft(anonPage.getByText(/用户名或密码|登录失败|凭据/i)).toBeVisible();

    await anonPage.goto("/todos");
    await expect.soft(anonPage, "未登录访问 /todos 应跳转登录").toHaveURL(/\/login/);

    await anonPage.context().clearCookies();
    await anonPage.goto("/login?from=/todos");
    await anonPage.getByLabel("用户名").fill(process.env.ADMIN_USERNAME ?? "");
    await anonPage.getByLabel("密码").fill(process.env.ADMIN_PASSWORD ?? "");
    await anonPage.getByRole("button", { name: "登录" }).click();
    await expect(anonPage).toHaveURL(/\/todos$/);
    await anonContext.close();

    const diagnostics = attachDiagnostics(page);
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "写下来的日常和想法。" })).toBeVisible();
    await expect(page.getByText(`${prefix} 文章 01`)).toBeVisible();
    await capturePage(page, testInfo, "public-blog-list");

    await page.goto("/blog/page/2");
    await expect(page.getByText(`${prefix} 文章 11`)).toBeVisible();
    await capturePage(page, testInfo, "public-blog-page-2");

    const postView = Promise.race([
      page.waitForResponse((response) => response.url().includes("/api/posts/view") && response.status() === 200),
      page.waitForTimeout(10_000).then(() => null),
    ]);
    await page.goto(`/blog/${seed.postSlug}`);
    await expect(page.getByRole("heading", { name: `${prefix} 文章 01` })).toBeVisible();
    await expect(page.locator("pre code").first()).toBeVisible();
    expect.soft(await postView, "博客详情应触发 /api/posts/view 浏览计数 beacon").not.toBeNull();
    await capturePage(page, testInfo, "public-blog-detail");

    const rss = await request.get("/rss.xml");
    expect.soft(rss.status()).toBe(200);
    const rssText = await rss.text();
    expect.soft(rssText).toContain("<rss");
    expect.soft(rssText).toContain(`${prefix} 文章`);

    await page.goto("/nav");
    await expect(page.getByRole("heading", { name: "常去的地方，收在一页。" })).toBeVisible();
    await expect(page.getByText(`${prefix} 导航 A`)).toBeVisible();
    await expectNoBrokenImages(page);
    await expectNoErrorOverlay(page);
    await capturePage(page, testInfo, "public-nav");

    expect.soft(diagnostics.consoleErrors, "公开区 console.error").toEqual([]);
    expect.soft(diagnostics.pageErrors, "公开区 pageerror").toEqual([]);
    expect.soft(diagnostics.failedRequests, "公开区失败请求").toEqual([]);
    expect.soft(diagnostics.badResponses, "公开区 4xx/5xx").toEqual([]);
  } finally {
    cleanupE2eData(prefix);
  }
});
