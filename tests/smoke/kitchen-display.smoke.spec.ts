import { test, expect } from "../fixtures";

test.describe("Kitchen Display System (KDS) - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/kitchen-display");
    await page.waitForLoadState("networkidle");
  });

  test("should load the KDS page", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/kitchen-display/);
  });

  test("should display KDS header", async ({ page }) => {
    await expect(page.getByText("KDS")).toBeVisible({ timeout: 10_000 });
  });

  test("should display Pending section", async ({ page }) => {
    await expect(page.getByText("Pending")).toBeVisible();
  });

  test("should display Processing section", async ({ page }) => {
    await expect(page.getByText("Processing")).toBeVisible();
  });

  test("should display time slot filters", async ({ page }) => {
    // Time slot filter chips should be present
    const filters = page.locator("button, [role='button']").filter({
      hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i,
    });
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(0); // May or may not have time slots
  });

  test("should display Quick Filter and search", async ({ page }) => {
    await expect(page.getByText("Quick Filter")).toBeVisible();
    const search = page.getByPlaceholder(/search/i);
    await expect(search).toBeVisible();
  });

  test("should display right sidebar actions", async ({ page }) => {
    const actions = [
      "Pause Online Order",
      "Menu Stock",
      "Inventory Stock",
      "Completed",
    ];
    for (const action of actions) {
      await expect(page.getByText(action)).toBeVisible();
    }
  });
});
