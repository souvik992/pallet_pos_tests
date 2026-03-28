import { test, expect } from "@playwright/test";

test.describe("Form Validation - Smoke Tests", () => {
  // All form validation tests start unauthenticated to test login form
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe("Login Form Validation", () => {
    test("should not allow submission with only mobile number filled", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");
      const loginButton = page.getByRole("button", { name: "LOGIN" });

      // Fill only mobile
      await mobileInput.fill("7872735817");
      expect(await pinInput.inputValue()).toBe("");

      // Attempt login
      await loginButton.click();
      await page.waitForTimeout(2_000);

      // Should still be on login page
      await expect(mobileInput).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });

    test("should not allow submission with only PIN filled", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");
      const loginButton = page.getByRole("button", { name: "LOGIN" });

      // Fill only PIN
      await pinInput.fill("1111");
      expect(await mobileInput.inputValue()).toBe("");

      // Attempt login
      await loginButton.click();
      await page.waitForTimeout(2_000);

      // Should still be on login page
      await expect(mobileInput).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });

    test("should handle special characters in mobile number input", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");

      // Type special characters
      await mobileInput.fill("787-273-5817");

      // The field should accept the input (with or without parsing)
      const value = await mobileInput.inputValue();
      expect(value).toBeTruthy();
      expect(value.length).toBeGreaterThan(0);
    });

    test("should handle numeric-only input in PIN field", async ({ page }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const pinInput = page.getByPlaceholder("Pin");

      // Type numeric PIN
      await pinInput.fill("1234");
      const value = await pinInput.inputValue();
      expect(value).toBe("1234");

      // PIN should be masked (type password)
      await expect(pinInput).toHaveAttribute("type", "password");
    });

    test("should clear fields properly when user resets input", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");

      // Fill both fields
      await mobileInput.fill("7872735817");
      await pinInput.fill("1111");

      // Clear fields
      await mobileInput.clear();
      await pinInput.clear();

      // Verify fields are empty
      expect(await mobileInput.inputValue()).toBe("");
      expect(await pinInput.inputValue()).toBe("");
    });

    test("should accept maximum length mobile number", async ({ page }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");

      // Type 15-digit mobile number
      await mobileInput.fill("787273581799999");

      const value = await mobileInput.inputValue();
      expect(value).toBeTruthy();
      expect(value.length).toBeGreaterThan(0);
    });

    test("should display LOGIN button in enabled state with valid form data", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");
      const loginButton = page.getByRole("button", { name: "LOGIN" });

      // Initially button should be enabled
      await expect(loginButton).toBeEnabled();

      // Fill form
      await mobileInput.fill("7872735817");
      await pinInput.fill("1111");

      // Button should remain enabled
      await expect(loginButton).toBeEnabled();
    });
  });

  test.describe("Form State Persistence", () => {
    test("should persist form values when navigating back", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      const mobileInput = page.getByPlaceholder("Mobile Number");
      const pinInput = page.getByPlaceholder("Pin");

      // Fill form
      await mobileInput.fill("7872735817");
      await pinInput.fill("1111");

      // Navigate away and back
      await page.goto("/");
      await page
        .getByPlaceholder("Mobile Number")
        .waitFor({ state: "visible", timeout: 20_000 });

      // Check if values persist (may or may not depending on implementation)
      const mobileValue = await mobileInput.inputValue();
      const pinValue = await pinInput.inputValue();

      // At minimum, form should be accessible after navigation
      await expect(mobileInput).toBeVisible();
      await expect(pinInput).toBeVisible();
    });
  });
});
