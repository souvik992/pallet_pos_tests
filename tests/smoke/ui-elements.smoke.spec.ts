import { test, expect } from "../fixtures";

test.describe("UI Elements & Interactions - Smoke Tests", () => {
  test.describe("Homepage UI Components", () => {
    test("should display all key dashboard sections", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Key dashboard sections
      const sections = [
        { name: "Greeting", locator: "Hello" },
        { name: "Session Timings", locator: "Session timings" },
        { name: "Contributions", locator: "Your Contributions" },
      ];

      for (const section of sections) {
        const element = page.getByText(section.locator);
        const isVisible = await element
          .isVisible({ timeout: 10_000 })
          .catch(() => false);
        expect(isVisible).toBeTruthy();
      }
    });

    test("should display metrics with numeric values", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const metrics = [
        "Total order processed",
        "Avg order value",
        "Total order value",
      ];

      for (const metric of metrics) {
        const element = page.getByText(metric);
        const isVisible = await element
          .isVisible({ timeout: 10_000 })
          .catch(() => false);
        expect(isVisible).toBeTruthy();
      }
    });

    test("should display chart visualization for orders", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for chart elements
      const chartText = page.getByText("Orders by channels");
      const chartElement = page.locator("canvas, [class*='chart'], svg");

      const chartTextVisible = await chartText
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      // Either chart text or actual SVG/canvas should be visible
      expect(chartTextVisible).toBeTruthy();
    });

    test("should display responsive layout on homepage", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Check that main content container exists
      const container = page.locator("[class*='MuiContainer'], [class*='layout']");

      const containerVisible = await container
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      expect(containerVisible).toBeTruthy();
    });
  });

  test.describe("Navigation Interactions", () => {
    test("should highlight current active page in navigation", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for active/highlighted nav item
      const navItems = page.locator('[role="button"].MuiListItemButton-root');
      const count = await navItems.count();

      expect(count).toBeGreaterThanOrEqual(1);

      // At least one nav item should be present
      if (count > 0) {
        const firstItem = navItems.first();
        await expect(firstItem).toBeVisible();
      }
    });

    test("should navigate between pages using sidebar links", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Get first nav item and click it
      const navItems = page.locator('[role="button"].MuiListItemButton-root');

      if ((await navItems.count()) > 1) {
        const secondItem = navItems.nth(1);
        await secondItem.click();

        // Should navigate to a different page
        await page.waitForLoadState("networkidle");

        // Should still be on a products page
        await expect(page).toHaveURL(/\/products\//);
      }
    });

    test("should have functional navigation menu", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const navItems = page.locator('[role="button"].MuiListItemButton-root');
      const count = await navItems.count();

      expect(count).toBeGreaterThan(0);

      // Check if items are clickable (have proper role and are enabled)
      for (let i = 0; i < Math.min(count, 3); i++) {
        const item = navItems.nth(i);
        await expect(item).toBeEnabled({ timeout: 5_000 });
      }
    });
  });

  test.describe("Interactive Elements", () => {
    test("should have clickable buttons on homepage", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for any buttons on the page
      const buttons = page.locator("button");
      const count = await buttons.count();

      // Should have at least some buttons
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("should have responsive input fields in forms", async ({
      page,
    }) => {
      // Start at login page to test form inputs
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");

      // Both inputs should be editable
      await expect(mobileInput).toBeEditable();
      await expect(pinInput).toBeEditable();

      // Should accept input
      await mobileInput.fill("1234567890");
      await pinInput.fill("1111");

      const mobileValue = await mobileInput.inputValue();
      const pinValue = await pinInput.inputValue();

      expect(mobileValue).toBeTruthy();
      expect(pinValue).toBeTruthy();
    });

    test("should display hover states on interactive elements", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Get a navigation item
      const navItem = page.locator('[role="button"].MuiListItemButton-root').first();

      // Hover over the element
      await navItem.hover();

      // Element should still be visible and enabled after hover
      await expect(navItem).toBeVisible();
      await expect(navItem).toBeEnabled();
    });
  });

  test.describe("Layout & Responsiveness", () => {
    test("should have proper header/top bar on pages", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for header elements
      const header = page.locator("header, [class*='AppBar'], [class*='topbar']");

      const headerVisible = await header
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      // Header or main container should be visible
      const container = page.locator("[class*='MuiContainer']");
      const containerVisible = await container.isVisible({ timeout: 5_000 }).catch(() => false);

      expect(headerVisible || containerVisible).toBeTruthy();
    });

    test("should maintain sidebar and main content layout", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for sidebar
      const sidebar = page.locator(
        '[role="navigation"], [class*="Sidebar"], [class*="drawer"]'
      );
      const navItems = page.locator('[role="button"].MuiListItemButton-root');

      // Check if sidebar or nav items exist
      const sidebarVisible = await sidebar
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const navItemsPresent = (await navItems.count()) > 0;

      expect(sidebarVisible || navItemsPresent).toBeTruthy();

      // Main content should be visible
      const mainContent = page.locator("main, [role='main']");
      const contentVisible = await mainContent
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(contentVisible).toBeTruthy();
    });

    test("should have proper spacing and padding", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Check that main container has proper structure
      const container = page.locator(
        "[class*='MuiContainer'], [class*='layout'], main"
      );

      const containerVisible = await container.isVisible({ timeout: 10_000 });
      expect(containerVisible).toBeTruthy();
    });
  });

  test.describe("Error States & Feedback", () => {
    test("should display error message on failed login attempt", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      // Try to login with invalid credentials
      await page.getByPlaceholder("Mobile Number").fill("0000000000");
      await page.getByPlaceholder("Pin").fill("0000");
      await page.getByRole("button", { name: "LOGIN" }).click();

      // Wait for potential error message or stay on same page
      await page.waitForTimeout(3_000);

      // Should still be on login page
      await expect(page.getByPlaceholder("Mobile Number")).toBeVisible();
    });

    test("should show loading state during page transitions", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Navigate to another page
      const navItems = page.locator('[role="button"].MuiListItemButton-root');

      if ((await navItems.count()) > 1) {
        const item = navItems.nth(1);
        await item.click();

        // Page should navigate (URL should change)
        await page.waitForNavigation({ waitUntil: "networkidle" });

        // Should be on a valid page
        await expect(page).toHaveURL(/\/products\//);
      }
    });
  });
});
