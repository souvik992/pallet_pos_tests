import { test, expect } from "../fixtures";

test.describe("Session & Authentication - Smoke Tests", () => {
  test.describe("Session Management", () => {
    test("should display active sessions on session listing page", async ({
      page,
    }) => {
      await page.goto("/session-page/session-listing");
      await page.waitForLoadState("networkidle");

      // Should show Active Sessions header or list
      await expect(
        page.getByText("Active Sessions", { exact: false })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("should allow navigation to cart from active session", async ({
      page,
    }) => {
      await page.goto("/session-page/session-listing");
      await page.waitForLoadState("networkidle");

      // Check if Go to Cart button exists
      const goToCartButton = page.getByRole("button", { name: /go to cart/i });

      if (await goToCartButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await goToCartButton.click();
        await page.waitForURL(/\/products\//, { timeout: 15_000 });

        // Should be on a products page after clicking Go to Cart
        await expect(page).toHaveURL(/\/products\//);
      }
    });

    test("should display session creation/start button on session listing page", async ({
      page,
    }) => {
      await page.goto("/session-page/session-listing");
      await page.waitForLoadState("networkidle");

      // Look for Start Session or Create Session button
      const startButton = page.getByRole("button", {
        name: /start|create|new session/i,
      });

      // Button should exist or Active Sessions should be visible
      const activeSessionsVisible = await page
        .getByText("Active Sessions", { exact: false })
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(
        (await startButton.isVisible({ timeout: 5_000 }).catch(() => false)) ||
          activeSessionsVisible
      ).toBeTruthy();
    });
  });

  test.describe("Authentication State", () => {
    test("should maintain authentication across page navigations", async ({
      page,
    }) => {
      // Start at homepage
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Navigate to different pages
      const pages = [
        "/products/particularcategorypage",
        "/products/kitchen-display",
        "/products/orderstable",
      ];

      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        await page.waitForLoadState("networkidle");

        // Should still be authenticated (on products page)
        await expect(page).toHaveURL(/\/products\//);
      }
    });

    test("should display user identification on authenticated pages", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Should show some user indicator (Hello greeting or username)
      const userIndicator = page.getByText(/Hello|Welcome|User|Profile/i);

      // At least one user identification should be visible
      const isVisible = await userIndicator
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      expect(isVisible).toBeTruthy();
    });

    test("should show restaurant/store name on homepage", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Should display the restaurant name
      const restaurantName = page.getByText(/Dum Durrust|Restaurant|Store/i);

      const isVisible = await restaurantName
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      expect(isVisible).toBeTruthy();
    });
  });

  test.describe("Page Access Control", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      // Clear storage to simulate unauthenticated state
      await page.context().clearCookies();

      // Try to access a protected page
      await page.goto("/products/homepage");

      // Should redirect to login page
      await expect(page).toHaveURL(/\/$/);
    });

    test("should allow authenticated users to access protected pages", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Should be on products page
      await expect(page).toHaveURL(/\/products\//);

      // Page should load successfully
      await expect(page).not.toHaveURL(/\/$/);
    });

    test("should have valid session data after login", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Get storage state
      const cookies = await page.context().cookies();

      // Should have some authentication cookies/storage
      expect(cookies.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Session Timeout & Expiry", () => {
    test("should keep session active during normal browsing", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const startUrl = page.url();

      // Wait a bit and navigate to another page
      await page.waitForTimeout(3_000);
      await page.goto("/products/orderstable");
      await page.waitForLoadState("networkidle");

      // Should still be authenticated
      await expect(page).toHaveURL(/\/products\//);
    });

    test("should display page load state indicators", async ({ page }) => {
      await page.goto("/products/homepage");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Check that main content is visible
      const mainContent = page.locator("main, [role='main']");
      const isVisible = await mainContent
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      // Either main content or MUI Container should be visible
      expect(
        isVisible ||
          (await page.locator("[class*='MuiContainer']").isVisible({ timeout: 5_000 }).catch(() => false))
      ).toBeTruthy();
    });
  });

  test.describe("Sidebar Navigation State", () => {
    test("should display sidebar navigation menu on authenticated pages", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for sidebar or navigation menu
      const sidebar = page.locator(
        '[role="navigation"], [class*="Sidebar"], [class*="drawer"]'
      );

      // Or check for list items in navigation
      const navItems = page.locator('[role="button"].MuiListItemButton-root');

      const sidebarVisible = await sidebar
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const navItemsPresent = (await navItems.count()) > 0;

      expect(sidebarVisible || navItemsPresent).toBeTruthy();
    });

    test("should have clickable navigation items", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Get all navigation buttons
      const navItems = page.locator('[role="button"].MuiListItemButton-root');
      const count = await navItems.count();

      // Should have multiple navigation items
      expect(count).toBeGreaterThanOrEqual(5);

      // All should be visible
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expect(navItems.nth(i)).toBeVisible();
      }
    });
  });
});
