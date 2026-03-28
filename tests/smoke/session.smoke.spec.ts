import { test, expect } from "../fixtures";

test.describe("Session Listing Page - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/session-page/session-listing");
    await page.waitForLoadState("networkidle");
  });

  test("should load the session listing page", async ({ page }) => {
    await expect(page).toHaveURL(/\/session-page\/session-listing/);
  });

  test("should display Active Sessions heading", async ({ page }) => {
    await expect(page.getByText("Active Sessions")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should display session table with headers", async ({ page }) => {
    const headers = [
      "Cashier Name",
      "Billing Counter",
      "License ID",
      "Start Time",
      "End Time",
      "Status",
    ];
    for (const header of headers) {
      await expect(page.getByText(header)).toBeVisible();
    }
  });

  test("should display active session with ACTIVE status", async ({
    page,
  }) => {
    await expect(page.getByText("ACTIVE")).toBeVisible();
  });

  test("should display Go to cart button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /go to cart/i })
    ).toBeVisible();
  });

  test("should display Stop session button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /stop session/i })
    ).toBeVisible();
  });

  test("should display Summary button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /summary/i })
    ).toBeVisible();
  });
});
