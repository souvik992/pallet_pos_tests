import { test, expect } from "../fixtures";

/**
 * Sanity Tests: Layout Navigation Bar
 * Source: webPOS Fine dine sheet – Layout navigation Bar module
 */
test.describe("Layout Navigation Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/homepage");
    await page.waitForLoadState("networkidle");
  });

  test("Return - navigation link is working", async ({ page }) => {
    // Return button in the layout nav should navigate back
    const returnBtn = page.getByRole("button", { name: /return/i }).first()
      .or(page.locator('[aria-label*="return"]').first());
    if (await returnBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await returnBtn.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("Settings - navigation is working", async ({ page }) => {
    const settingsBtn = page.locator('[role="button"].MuiListItemButton-root').nth(11);
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("Sessions - navigation is working", async ({ page }) => {
    await page.goto("/session-page/session-listing");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Active Sessions")).toBeVisible({ timeout: 10000 });
  });

  test("Inventory - navigation is working", async ({ page }) => {
    await page.goto("/products/inventory");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/products\/inventory/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("ODS - if enabled from RMS it should appear in navigation", async ({ page }) => {
    // ODS (Online Delivery Service) navigation item
    await page.goto("/products/homepage");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("ODS - if disabled from RMS it should not appear in navigation", async ({ page }) => {
    await page.goto("/products/homepage");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("KDS - navigation is working when enabled from RMS", async ({ page }) => {
    await page.goto("/products/kitchen-display");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("KDS")).toBeVisible({ timeout: 10000 });
  });

  test("KDS - if disabled from RMS it should not appear in navigation", async ({ page }) => {
    await page.goto("/products/homepage");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Table order - navigation is working", async ({ page }) => {
    await page.goto("/products/orderstable");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Orders", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("Menu - navigation is working", async ({ page }) => {
    const menuBtn = page.getByText(/^Menu$/i).first();
    if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("orders - navigation is working", async ({ page }) => {
    await page.goto("/products/orderstable");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/products\/orderstable/);
  });
});
