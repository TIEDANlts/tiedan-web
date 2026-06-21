import { expect, test } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, ".auth", "admin.json");

test("保存管理员登录态", async ({ page }) => {
  expect(process.env.ADMIN_USERNAME, "需要配置 ADMIN_USERNAME 后运行 e2e").toBeTruthy();
  expect(process.env.ADMIN_PASSWORD, "需要配置 ADMIN_PASSWORD 后运行 e2e").toBeTruthy();

  await page.goto("/login?from=/todos");
  await page.getByLabel("用户名").fill(process.env.ADMIN_USERNAME ?? "");
  await page.getByLabel("密码").fill(process.env.ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/todos$/);
  await expect(page.getByRole("heading", { name: "今天先做哪几件事" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
