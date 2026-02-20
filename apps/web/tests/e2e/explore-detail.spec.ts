import { expect, test } from "@playwright/test";

test("user can open model detail from explore list", async ({ page }) => {
  await page.goto("/");
  const firstDetail = page.getByRole("link", { name: "查看详情" }).first();
  await expect(firstDetail).toBeVisible();
  await firstDetail.click();
  await expect(page).toHaveURL(/\/models\//);
  await expect(page.getByRole("link", { name: "返回探索" })).toBeVisible();
});
