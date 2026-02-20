import { test, expect } from "@playwright/test";

test("new user can complete onboarding and get advisor response", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始咨询" }).click();
  await page.getByPlaceholder("请输入你的业务问题").fill("我们是SaaS公司，想提升销售转化");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.locator(".bubble-ai")).toHaveCount(2, { timeout: 20000 });
});
