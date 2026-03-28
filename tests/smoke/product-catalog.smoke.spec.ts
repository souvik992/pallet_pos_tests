import { test, expect } from "../fixtures";

test.describe("Product Catalog - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/particularcategorypage");
    await page.waitForLoadState("networkidle");
  });

  test("should load the product catalog page", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/particularcategorypage/);
  });

  test("should display category filters", async ({ page }) => {
    // Filter chips: All, Veg, Non Veg, Combos, Bestseller
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByText("Veg")).toBeVisible();
    await expect(page.getByText("Non Veg")).toBeVisible();
  });

  test("should display search bar", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search Products");
    await expect(searchInput).toBeVisible();
  });

  test("should display categories sidebar", async ({ page }) => {
    await expect(page.getByText("Categories")).toBeVisible();
  });

  test("should display product items", async ({ page }) => {
    // At least one "Add +" button should be visible for products
    const addButtons = page.getByRole("button", { name: /Add/i });
    await expect(addButtons.first()).toBeVisible({ timeout: 15_000 });
  });

  test("should display order type tabs", async ({ page }) => {
    // Order type tabs: Dine in, Take Away, Delivery
    await expect(page.getByText("Dine in")).toBeVisible();
    await expect(page.getByText("Take Away")).toBeVisible();
    await expect(page.getByText("Delivery")).toBeVisible();
  });

  test("should display cart section", async ({ page }) => {
    // Cart area should be present (even if empty)
    const cartArea = page.getByText(/your cart is empty|Cart/i);
    await expect(cartArea.first()).toBeVisible();
  });

  test("should display right sidebar actions", async ({ page }) => {
    // Right side action buttons
    await expect(page.getByText("Customer")).toBeVisible();
    await expect(page.getByText("Discounts")).toBeVisible();
    await expect(page.getByText("Coupons")).toBeVisible();
  });

  test("should have view toggle buttons", async ({ page }) => {
    // Grid and list view toggle buttons
    const viewToggles = page.locator("button svg").first();
    await expect(viewToggles).toBeVisible();
  });
});
