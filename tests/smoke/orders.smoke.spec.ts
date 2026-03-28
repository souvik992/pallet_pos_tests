import { test, expect } from "../fixtures";

test.describe("Orders Page - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/orderstable");
    await page.waitForLoadState("networkidle");
  });

  test("should load the orders page", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/orderstable/);
  });

  test("should display Orders heading", async ({ page }) => {
    await expect(page.getByText("Orders")).toBeVisible({ timeout: 10_000 });
  });

  test("should display Today's Orders button", async ({ page }) => {
    await expect(page.getByText("Today's Orders")).toBeVisible();
  });

  test("should display order type filter tabs", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "All" }).first()
    ).toBeVisible();
    await expect(page.getByText("Delivery")).toBeVisible();
    await expect(page.getByText("Take Away")).toBeVisible();
    await expect(page.getByText("Dine In")).toBeVisible();
  });

  test("should display the orders table headers", async ({ page }) => {
    const headers = ["Order Id", "Date", "Source", "Table Number"];
    for (const header of headers) {
      await expect(page.getByText(header)).toBeVisible();
    }
  });

  test("should display search bar", async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      /search by order id|invoice id|customer/i
    );
    await expect(searchInput).toBeVisible();
  });

  test("should display session orders dropdown", async ({ page }) => {
    await expect(page.getByText("Session orders")).toBeVisible();
  });

  test("should display date picker", async ({ page }) => {
    await expect(page.getByText("Select Date")).toBeVisible();
  });
});
