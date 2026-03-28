import { test, expect } from "../fixtures";

test.describe("Homepage / Dashboard - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/homepage");
    await page.waitForLoadState("networkidle");
  });

  test("should load the homepage", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/homepage/);
  });

  test("should display the greeting message", async ({ page }) => {
    // The dashboard shows "Hello <username>!"
    await expect(page.getByText(/Hello/i)).toBeVisible({ timeout: 10_000 });
  });

  test("should display restaurant/store name", async ({ page }) => {
    // Restaurant name section is visible
    await expect(page.getByText(/Dum Durrust/i)).toBeVisible();
  });

  test("should display session timings widget", async ({ page }) => {
    await expect(page.getByText("Session timings")).toBeVisible();
  });

  test("should display Your Contributions section", async ({ page }) => {
    await expect(page.getByText("Your Contributions")).toBeVisible();
  });

  test("should display key metrics", async ({ page }) => {
    const metrics = [
      "Total order processed",
      "Avg order value",
      "Total order value",
    ];
    for (const metric of metrics) {
      await expect(page.getByText(metric)).toBeVisible();
    }
  });

  test("should display Orders by channels chart", async ({ page }) => {
    await expect(page.getByText("Orders by channels")).toBeVisible();
  });

  test("should display the sidebar navigation", async ({ page }) => {
    // Sidebar should have navigation items (MUI ListItemButtons)
    const navItems = page.locator(
      '[role="button"].MuiListItemButton-root'
    );
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });
});
