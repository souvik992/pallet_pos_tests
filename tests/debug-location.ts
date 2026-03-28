import { test, expect } from "@playwright/test";

test("capture location page", async ({ page }) => {
  const username = process.env.POS_USERNAME!;
  const pin = process.env.POS_PIN!;

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("Mobile Number").fill(username);
  await page.getByPlaceholder("Pin").fill(pin);
  await page.getByRole("button", { name: "LOGIN" }).click();

  await page.waitForURL(/\/products\/location/, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2_000);

  await page.screenshot({ path: "location-page.png", fullPage: true });
});
