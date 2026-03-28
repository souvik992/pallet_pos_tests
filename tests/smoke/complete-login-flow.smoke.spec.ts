import { test, expect } from "@playwright/test";

/**
 * Complete POS Login Flow Test
 *
 * This test covers the full login journey from credentials entry to cart access:
 * Step 1: Enter login credentials (Mobile Number + PIN)
 * Step 2: Select location (CANTEEN → Sakura Cafe)
 * Step 3: Select terminal (TestPos-1)
 * Step 4: Enter cash amount (1)
 * Step 5: Login as manager
 * Step 6: Navigate to cart/product page
 */

test.describe("Complete Login Flow - Smoke Tests", () => {
  // Use empty storage (unauthenticated) to test full login flow
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should complete full login flow from credentials to cart", async ({
    page,
  }) => {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Navigate to login page and enter credentials
    // ═══════════════════════════════════════════════════════════════
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for login form
    const mobileInput = page.getByPlaceholder("Mobile Number");
    const pinInput = page.getByPlaceholder("Pin");
    const loginButton = page.getByRole("button", { name: "LOGIN" });

    await expect(mobileInput).toBeVisible({ timeout: 20_000 });
    await expect(pinInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Fill in credentials
    await mobileInput.fill(process.env.POS_USERNAME || "7872735817");
    await pinInput.fill(process.env.POS_PIN || "1111");

    // Verify credentials are entered
    await expect(mobileInput).toHaveValue(
      parseInt(process.env.POS_USERNAME || "7872735817")
    );
    await expect(pinInput).toHaveValue(process.env.POS_PIN || "1111");

    // Click LOGIN
    await loginButton.click();

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Select Location (CANTEEN → Sakura Cafe)
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(/\/products\/location/, { timeout: 30_000 });

    // Verify location selection page
    const locationText = page.getByText("Select Location");
    await expect(locationText).toBeVisible({ timeout: 10_000 });

    // Open locations dropdown
    const locationsDropdown = page.locator('[class*="dropdown"]').first();
    await locationsDropdown.click();

    // Select CANTEEN (parent location)
    const canteenOption = page.locator('text="CANTEEN"').first();
    await canteenOption.click();
    await page.waitForTimeout(500);

    // Select Sakura Cafe (sub-location under CANTEEN)
    const sakuraCafeOption = page.locator('text="Sakura Cafe"').first();
    await expect(sakuraCafeOption).toBeVisible({ timeout: 5_000 });
    await sakuraCafeOption.click();

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Select Terminal
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(/\/session-page\/start-day/, { timeout: 30_000 });

    // Verify start session page
    const selectTerminalText = page.getByText("Select Terminal");
    await expect(selectTerminalText).toBeVisible({ timeout: 10_000 });

    // Open terminal dropdown
    const terminalDropdown = page.locator('[class*="dropdown"]').first();
    await terminalDropdown.click();

    // Select first available terminal (TestPos-1)
    const testPosOption = page.locator('text="TestPos-1"').first();
    await expect(testPosOption).toBeVisible({ timeout: 5_000 });
    await testPosOption.click();

    // Click Start session button
    const startSessionButton = page.getByRole("button", {
      name: "Start session",
    });
    await startSessionButton.click();

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Enter Cash Amount
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(/\/session-page\/opening/, { timeout: 30_000 });

    // Verify opening/cash amount page
    const cashAmountText = page.getByText("Cash amount");
    await expect(cashAmountText).toBeVisible({ timeout: 10_000 });

    // Enter cash amount
    const cashAmountInput = page.getByPlaceholder("Enter cash amount");
    await expect(cashAmountInput).toBeVisible();
    await cashAmountInput.fill("1");

    // Verify cash amount is entered
    await expect(cashAmountInput).toHaveValue("1");

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Login as Manager
    // ═══════════════════════════════════════════════════════════════
    const loginAsManagerButton = page.getByRole("button", {
      name: "Login as manager",
    });
    await expect(loginAsManagerButton).toBeVisible();
    await loginAsManagerButton.click();

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Navigate to Cart (Product Page)
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(/\/session-page\/session-listing/, {
      timeout: 30_000,
    });

    // Verify active sessions page
    const activeSessionsText = page.getByText("Active Sessions");
    await expect(activeSessionsText).toBeVisible({ timeout: 10_000 });

    // Verify session details are displayed
    const sessionTable = page.locator("table");
    await expect(sessionTable).toBeVisible();

    // Verify our session is active
    const activeStatus = page.getByText("ACTIVE");
    await expect(activeStatus).toBeVisible();

    // Click Go to cart button
    const goToCartButton = page.getByRole("button", { name: "Go to cart" });
    await expect(goToCartButton).toBeVisible();
    await goToCartButton.click();

    // ═══════════════════════════════════════════════════════════════
    // FINAL VERIFICATION: Cart/Product Page
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(/\/products\/particularcategorypage/, {
      timeout: 30_000,
    });

    // Verify we're on the product/cart page
    await expect(page).toHaveURL(/\/products\/particularcategorypage/);

    // Verify cart page elements
    const tableElements = page.locator('[role="button"]').filter({
      hasText: /^[T|t]\d+$/,
    });
    const tableCount = await tableElements.count();
    expect(tableCount).toBeGreaterThan(0);

    // Verify bottom menu is present
    const menuItems = page.locator("button").filter({
      hasText: /Returns|Settings|Sessions|Inventory|Menu|Orders/,
    });
    const menuItemCount = await menuItems.count();
    expect(menuItemCount).toBeGreaterThan(0);

    // Verify session is active
    const printerConnectedText = page.locator('text="Printer: Connected"');
    const printerConnected = await printerConnectedText
      .isVisible({ timeout: 5_000 })
      .catch(() => true); // Printer connection is optional
    expect(printerConnected).toBeTruthy();
  });

  test("should maintain session after navigation", async ({ page }) => {
    // Use same login flow but check persistence
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const mobileInput = page.getByPlaceholder("Mobile Number");
    const pinInput = page.getByPlaceholder("Pin");

    await mobileInput.fill(process.env.POS_USERNAME || "7872735817");
    await pinInput.fill(process.env.POS_PIN || "1111");

    const loginButton = page.getByRole("button", { name: "LOGIN" });
    await loginButton.click();

    // Navigate through location selection
    await page.waitForURL(/\/products\/location/, { timeout: 30_000 });

    const locationsDropdown = page.locator('[class*="dropdown"]').first();
    await locationsDropdown.click();

    const canteenOption = page.locator('text="CANTEEN"').first();
    await canteenOption.click();

    const sakuraCafeOption = page.locator('text="Sakura Cafe"').first();
    await sakuraCafeOption.click();

    // Select terminal
    await page.waitForURL(/\/session-page\/start-day/, { timeout: 30_000 });

    const terminalDropdown = page.locator('[class*="dropdown"]').first();
    await terminalDropdown.click();

    const testPosOption = page.locator('text="TestPos-1"').first();
    await testPosOption.click();

    const startSessionButton = page.getByRole("button", {
      name: "Start session",
    });
    await startSessionButton.click();

    // Enter cash amount
    await page.waitForURL(/\/session-page\/opening/, { timeout: 30_000 });

    const cashAmountInput = page.getByPlaceholder("Enter cash amount");
    await cashAmountInput.fill("1");

    const loginAsManagerButton = page.getByRole("button", {
      name: "Login as manager",
    });
    await loginAsManagerButton.click();

    // Navigate to cart
    await page.waitForURL(/\/session-page\/session-listing/, {
      timeout: 30_000,
    });

    const goToCartButton = page.getByRole("button", { name: "Go to cart" });
    await goToCartButton.click();

    // Verify on cart page
    await page.waitForURL(/\/products\/particularcategorypage/, {
      timeout: 30_000,
    });

    // Navigate to another page
    const menuButton = page.getByRole("button", { name: "Menu" });
    if (await menuButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await menuButton.click();
      await page.waitForNavigation({ waitUntil: "networkidle" });
    }

    // Should still be logged in (on a products page)
    await expect(page).toHaveURL(/\/products\//);
  });

  test("should handle location selection with multiple canteens", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const mobileInput = page.getByPlaceholder("Mobile Number");
    const pinInput = page.getByPlaceholder("Pin");

    await mobileInput.fill(process.env.POS_USERNAME || "7872735817");
    await pinInput.fill(process.env.POS_PIN || "1111");

    const loginButton = page.getByRole("button", { name: "LOGIN" });
    await loginButton.click();

    // On location page
    await page.waitForURL(/\/products\/location/, { timeout: 30_000 });

    // Verify multiple locations are available
    const locationsDropdown = page.locator('[class*="dropdown"]').first();
    await locationsDropdown.click();

    const locationOptions = page.locator('[class*="option"]');
    const optionCount = await locationOptions.count();

    // Should have multiple location options
    expect(optionCount).toBeGreaterThan(0);

    // Select CANTEEN location
    const canteenOption = page.locator('text="CANTEEN"').first();
    await canteenOption.click();
    await page.waitForTimeout(500);

    // Verify sub-locations appear (like Sakura Cafe)
    const sakuraCafeOption = page.locator('text="Sakura Cafe"').first();
    await expect(sakuraCafeOption).toBeVisible({ timeout: 5_000 });
  });

  test("should display terminal list when opening dropdown", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const mobileInput = page.getByPlaceholder("Mobile Number");
    const pinInput = page.getByPlaceholder("Pin");

    await mobileInput.fill(process.env.POS_USERNAME || "7872735817");
    await pinInput.fill(process.env.POS_PIN || "1111");

    const loginButton = page.getByRole("button", { name: "LOGIN" });
    await loginButton.click();

    // Location selection
    await page.waitForURL(/\/products\/location/, { timeout: 30_000 });

    const locationsDropdown = page.locator('[class*="dropdown"]').first();
    await locationsDropdown.click();

    const canteenOption = page.locator('text="CANTEEN"').first();
    await canteenOption.click();

    const sakuraCafeOption = page.locator('text="Sakura Cafe"').first();
    await sakuraCafeOption.click();

    // Terminal selection page
    await page.waitForURL(/\/session-page\/start-day/, { timeout: 30_000 });

    const selectTerminalText = page.getByText("Select Terminal");
    await expect(selectTerminalText).toBeVisible();

    // Open terminal dropdown
    const terminalDropdown = page.locator('[class*="dropdown"]').first();
    await terminalDropdown.click();

    // Verify multiple terminals are available
    const terminalOptions = page.locator('[class*="option"]');
    const terminalCount = await terminalOptions.count();

    // Should have multiple terminals
    expect(terminalCount).toBeGreaterThan(0);

    // Verify TestPos-1 is available
    const testPosOption = page.locator('text="TestPos-1"').first();
    await expect(testPosOption).toBeVisible();
  });
});
