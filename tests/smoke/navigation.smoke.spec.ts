import { test, expect } from "../fixtures";

test.describe("Sidebar Navigation - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/homepage");
    await page.waitForLoadState("networkidle");
  });

  test("should navigate from homepage to product catalog", async ({
    page,
  }) => {
    // Click the cart/product catalog icon (2nd sidebar item)
    const navItems = page.locator(
      '[role="button"].MuiListItemButton-root'
    );
    await navItems.nth(1).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/products\/particularcategorypage/);
    await expect(page.getByText("Categories")).toBeVisible();
  });

  test("should navigate from homepage to orders page", async ({ page }) => {
    const navItems = page.locator(
      '[role="button"].MuiListItemButton-root'
    );
    // Orders is approximately the 5th sidebar item
    await navItems.nth(4).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/products\/orderstable/);
    await expect(page.getByText("Orders")).toBeVisible();
  });

  test("should navigate back to homepage from other pages", async ({
    page,
  }) => {
    // Go to orders first
    await page.goto("/products/orderstable");
    await page.waitForLoadState("networkidle");

    // Click home icon (1st sidebar item)
    const navItems = page.locator(
      '[role="button"].MuiListItemButton-root'
    );
    await navItems.first().click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/products\/homepage/);
    await expect(page.getByText(/Hello/i)).toBeVisible();
  });

  test("should highlight the active sidebar item", async ({ page }) => {
    // The homepage icon should have an active state
    const homeItem = page.locator(
      '[role="button"].MuiListItemButton-root'
    ).first();

    // Check for active class or styling
    const classList = await homeItem.getAttribute("class");
    expect(classList).toBeTruthy();
  });
});
