import { expect, test } from "@playwright/test";

test("健康检查返回 ok", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true });
});

test("匿名访问博客不会跳到登录页", async ({ request }) => {
  const response = await request.get("/blog", { maxRedirects: 0 });

  expect(response.status()).toBe(200);
  expect(response.headers().location).toBeUndefined();
});

test("使用管理员账号登录后能访问待办页", async ({ page }) => {
  expect(process.env.ADMIN_USERNAME, "需要配置 ADMIN_USERNAME 后运行 e2e").toBeTruthy();
  expect(process.env.ADMIN_PASSWORD, "需要配置 ADMIN_PASSWORD 后运行 e2e").toBeTruthy();

  await page.goto("/login?from=/todos");
  await page.getByLabel("用户名").fill(process.env.ADMIN_USERNAME ?? "");
  await page.getByLabel("密码").fill(process.env.ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/todos$/);
  await expect(page.getByRole("heading", { name: "今天先做哪几件事" })).toBeVisible();
});
