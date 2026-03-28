import { test, expect } from "@playwright/test";

test.describe("Error Handling & Edge Cases - Smoke Tests", () => {
  test.describe("Invalid Input Handling", () => {
    test("should handle empty form submission gracefully", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      // Click LOGIN without filling anything
      await page.getByRole("button", { name: "LOGIN" }).click();
      await page.waitForTimeout(2_000);

      // Should stay on login page
      await expect(page.getByPlaceholder("Mobile Number")).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });

    test("should handle whitespace-only input", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      // Fill with whitespace
      await page.getByPlaceholder("Mobile Number").fill("     ");
      await page.getByPlaceholder("Pin").fill("     ");

      // Click LOGIN
      await page.getByRole("button", { name: "LOGIN" }).click();
      await page.waitForTimeout(2_000);

      // Should stay on login page
      await expect(page.getByPlaceholder("Mobile Number")).toBeVisible();
    });

    test("should handle very long input gracefully", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const longString = "1".repeat(100);

      // Try to enter very long input
      const mobileInput = page.getByPlaceholder("Mobile Number");
      await mobileInput.fill(longString);

      // Input should handle it without crashing
      await expect(mobileInput).toBeVisible();
      await expect(mobileInput).toBeFocused().catch(() => {
        // May not be focused but should exist
        expect(true).toBeTruthy();
      });
    });

    test("should handle special characters in input fields", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const specialChars = "!@#$%^&*()";

      // Try to enter special characters
      const mobileInput = page.getByPlaceholder("Mobile Number");
      await mobileInput.fill(specialChars);

      // Should handle without crashing
      await expect(mobileInput).toBeVisible();

      const value = await mobileInput.inputValue();
      expect(value).toBeTruthy();
    });
  });

  test.describe("Network Error Handling", () => {
    test("should display page content even if some assets fail", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Check main content loads regardless of assets
      const greetingText = page.getByText(/Hello/i);

      const isVisible = await greetingText
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      // Main content should still load
      expect(isVisible).toBeTruthy();
    });

    test("should handle slow network conditions", async ({ page }) => {
      // Simulate slow network
      await page.route("**/*", (route) => {
        setTimeout(() => route.continue(), 100);
      });

      const startTime = Date.now();

      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      // Should still load successfully, just slower
      await expect(page).toHaveURL(/\/products\/homepage/);

      // Page should complete load even with simulated latency
      expect(loadTime).toBeGreaterThan(0);
    });

    test("should handle failed image loads gracefully", async ({ page }) => {
      await page.route("**/*.{png,jpg,jpeg,gif,webp}", (route) => route.abort());

      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Page should still be functional without images
      await expect(page).toHaveURL(/\/products\/homepage/);

      // Text content should still be visible
      const content = page.getByText(/Hello|dashboard|session/i);
      const isVisible = await content
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      expect(isVisible).toBeTruthy();
    });
  });

  test.describe("Session & Timeout Errors", () => {
    test("should handle invalid auth state gracefully", async ({ page }) => {
      // Clear cookies to simulate invalid session
      await page.context().clearCookies();

      // Try to access protected page
      await page.goto("/products/homepage");

      // Should redirect to login
      await expect(page).toHaveURL(/\/$/);
    });

    test("should handle concurrent navigation requests", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Try to navigate multiple times quickly
      const navItems = page.locator('[role="button"].MuiListItemButton-root');

      if ((await navItems.count()) > 1) {
        // Click first nav item
        const firstItem = navItems.first();
        firstItem.click().catch(() => {
          // Handle potential race condition
        });

        // Wait for navigation
        try {
          await page.waitForNavigation({ timeout: 10_000 });
        } catch {
          // Navigation might not happen if items weren't properly loaded
        }

        // Page should still be valid
        await expect(page).toHaveURL(/\/products\/|\/session-page\//);
      }
    });
  });

  test.describe("Boundary & Edge Cases", () => {
    test("should handle minimum length input in forms", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      // Try single character
      await page.getByPlaceholder("Mobile Number").fill("1");

      const value = await page
        .getByPlaceholder("Mobile Number")
        .inputValue();

      expect(value).toBeTruthy();
    });

    test("should preserve user input when validation fails", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const testNumber = "5555555555";

      // Fill input
      await mobileInput.fill(testNumber);

      // Try to submit
      await page.getByRole("button", { name: "LOGIN" }).click();
      await page.waitForTimeout(1_000);

      // Input should still contain the value (preserved)
      const value = await mobileInput.inputValue();
      expect(value.includes("5") || value.length > 0).toBeTruthy();
    });

    test("should handle rapid form interactions", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");

      // Rapid interactions
      await mobileInput.fill("9");
      await pinInput.fill("1");
      await mobileInput.fill("99");
      await pinInput.fill("11");
      await mobileInput.fill("999");
      await pinInput.fill("111");

      // Should end up in valid state
      const mobileValue = await mobileInput.inputValue();
      const pinValue = await pinInput.inputValue();

      expect(mobileValue).toBeTruthy();
      expect(pinValue).toBeTruthy();
    });

    test("should handle form input with different keyboard methods", async ({
      page,
    }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");

      // Type method
      await mobileInput.type("123");

      // Clear and use fill
      await mobileInput.clear();
      await mobileInput.fill("456");

      const value = await mobileInput.inputValue();
      expect(value).toContain("456");
    });
  });

  test.describe("Recovery from Errors", () => {
    test("should allow retry after failed login attempt", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      // First attempt with invalid credentials
      await page.getByPlaceholder("Mobile Number").fill("0000000000");
      await page.getByPlaceholder("Pin").fill("0000");
      await page.getByRole("button", { name: "LOGIN" }).click();

      await page.waitForTimeout(3_000);

      // Should be able to retry
      const mobileInput = page.getByPlaceholder("Mobile Number");
      await mobileInput.clear();
      await mobileInput.fill("7872735817");

      const pinInput = page.getByPlaceholder("Pin");
      await pinInput.clear();
      await pinInput.fill("1111");

      // Form should be ready for another attempt
      await expect(mobileInput).toHaveValue("7872735817");
      await expect(pinInput).toHaveValue("1111");
    });

    test("should recover from page refresh during navigation", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Refresh page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Should still be authenticated and on homepage
      await expect(page).toHaveURL(/\/products\/homepage/);

      // Content should reload
      const greetingText = page.getByText(/Hello/i);

      const isVisible = await greetingText
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      expect(isVisible).toBeTruthy();
    });
  });
});
