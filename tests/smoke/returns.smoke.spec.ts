import { test, expect } from "../fixtures";

test.describe("Returns Page - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/returns");
    await page.waitForLoadState("networkidle");
  });

  test("should load the returns page", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/returns/);
  });

  test("should display Returns heading", async ({ page }) => {
    await expect(page.getByText("Returns")).toBeVisible({ timeout: 10_000 });
  });

  test("should display New Return button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /New Return/i })
    ).toBeVisible();
  });

  test("should display Session Returns dropdown", async ({ page }) => {
    await expect(page.getByText("Session Returns")).toBeVisible();
  });

  test("should display returns table headers", async ({ page }) => {
    const headers = ["Date", "Order Id", "Return Id", "Cashier Name"];
    for (const header of headers) {
      await expect(page.getByText(header)).toBeVisible();
    }
  });

  test("should display search bar", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search returns/i);
    await expect(searchInput).toBeVisible();
  });

  test("should display date picker", async ({ page }) => {
    await expect(page.getByText("Select Date")).toBeVisible();
  });
});
