import { test as setup, expect } from "@playwright/test";

/**
 * Unified Authentication Setup
 *
 * Single login flow covering all screens:
 * 1. Login page (credentials)
 * 2. Location selection (CANTEEN → Sakura Cafe)
 * 3. Terminal selection (TestPos-1)
 * 4. Cash amount entry (1)
 * 5. Manager login
 * 6. Authenticated session ready for tests
 *
 * Saves authentication state for both smoke and sanity tests.
 */

setup("authenticate", async ({ page }) => {
  const username = process.env.POS_USERNAME || "7872735817";
  const pin = process.env.POS_PIN || "1111";

  if (!username || !pin) {
    throw new Error(
      "Missing POS_USERNAME or POS_PIN in environment variables. Check your .env file."
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Navigate to login page
  // ═══════════════════════════════════════════════════════════════
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // If already authenticated (on products page), save state and return
  if (page.url().includes("/products/")) {
    console.log("Already authenticated. Saving state...");
    await page.context().storageState({ path: "auth-state.json" });
    await page.context().storageState({ path: "advanced-auth-state.json" });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Fill login form and submit credentials
  // ═══════════════════════════════════════════════════════════════
  try {
    await expect(page.getByPlaceholder("Mobile Number")).toBeVisible({
      timeout: 20_000,
    });
  } catch (error) {
    throw new Error("Login form not found. Please check the login page.");
  }

  const mobileInput = page.getByPlaceholder("Mobile Number");
  const pinInput = page.getByPlaceholder("Pin");

  await mobileInput.fill(username);
  await pinInput.fill(pin);

  const loginButton = page.getByRole("button", { name: "LOGIN" });
  await loginButton.click();

  console.log("Login credentials submitted...");

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Wait for post-login navigation
  // ═══════════════════════════════════════════════════════════════
  await page.waitForURL(
    /\/(products\/(location|homepage|particularcategorypage)|session-page)/,
    { timeout: 30_000 }
  );

  // If we landed on homepage, click the cart icon in the left nav to reach the table layout page
  if (page.url().includes("/products/homepage") || page.url().includes("/products/particularcategorypage")) {
    if (page.url().includes("/products/homepage")) {
      console.log("Landed on homepage — clicking cart icon to navigate to table layout...");
      const cartNavBtn = page.locator('[role="button"].MuiListItemButton-root').first();
      if (await cartNavBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await cartNavBtn.click();
        await page.waitForURL(/\/products\/particularcategorypage/, { timeout: 15_000 }).catch(async () => {
          await page.goto("/products/particularcategorypage");
          await page.waitForLoadState("domcontentloaded");
        });
      } else {
        await page.goto("/products/particularcategorypage");
        await page.waitForLoadState("domcontentloaded");
      }
    }
    console.log("Landed on authenticated page after login. Skipping location/terminal/cash steps.");
    await page.context().storageState({ path: "auth-state.json" });
    await page.context().storageState({ path: "advanced-auth-state.json" });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Handle Location Selection Screen
  // ═══════════════════════════════════════════════════════════════
  try {
    if (page.url().includes("/products/location")) {
      console.log("On location selection page...");

      // Verify location selection page
      await expect(page.getByText("Select Location")).toBeVisible({
        timeout: 10_000,
      });

      // Expand the locations list
      const locationsDropdown = page.locator('[class*="dropdown"]').first();
      await locationsDropdown.click();
      await page.waitForTimeout(500);

      // Select canteen (parent location)
      const canteenOption = page.locator('text="canteen"').first();
      await expect(canteenOption).toBeVisible({ timeout: 10_000 });
      await canteenOption.click();
      await page.waitForTimeout(500);

      // Select CANTEEN _ TEST sub-location
      const canteenTestOption = page.locator('text="CANTEEN _ TEST"').first();
      await expect(canteenTestOption).toBeVisible({ timeout: 5_000 });
      await canteenTestOption.click();

      console.log("Location selected: canteen → CANTEEN _ TEST");
    }
  } catch (error) {
    console.log("Location selection not needed or skipped.");
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Handle Terminal Selection Screen
  // ═══════════════════════════════════════════════════════════════
  try {
    await page.waitForURL(/\/session-page\/(start-day|start|opening)/, {
      timeout: 15_000,
    }).catch(() => {
      // May skip this step if location led directly to homepage
    });

    // Handle Start Day button if present
    const startDayBtn = page.getByRole("button", { name: /start day/i });
    const isStartDayVisible = await startDayBtn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (isStartDayVisible) {
      console.log("Clicking Start Day button...");
      await startDayBtn.click();
      await page.waitForTimeout(3_000);
    }

    // Check if we're on terminal selection page
    const terminalPageCheck = page
      .getByText("Select Terminal")
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (await terminalPageCheck) {
      console.log("On terminal selection page...");

      // Open terminal dropdown
      const terminalDropdown = page.locator('[class*="dropdown"]').first();
      await terminalDropdown.click();
      await page.waitForTimeout(500);

      // Select Terminal 1
      const terminalOption = page.locator('text="Terminal 1"').first();
      await expect(terminalOption).toBeVisible({ timeout: 5_000 });
      await terminalOption.click();

      // Click Start session button
      const startSessionButton = page.getByRole("button", {
        name: "Start session",
      });
      await expect(startSessionButton).toBeEnabled({ timeout: 5_000 });
      await startSessionButton.click();

      console.log("Terminal selected and session started.");
    }
  } catch (error) {
    console.log("Terminal selection not needed or already passed.");
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: Handle Cash Amount Entry Screen
  // ═══════════════════════════════════════════════════════════════
  try {
    const cashVisible = await page
      .getByText("Cash amount")
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (cashVisible) {
      console.log("On cash amount page...");

      // Enter cash amount
      const cashAmountInput = page.getByPlaceholder("Enter cash amount");
      await cashAmountInput.fill("1");

      // Click Login as manager button
      const loginAsManagerButton = page.getByRole("button", {
        name: "Login as manager",
      });
      await loginAsManagerButton.click();

      console.log("Cash amount entered and manager login clicked.");
    }
  } catch (error) {
    console.log("Cash amount screen not needed.");
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: Final Navigation & Verification
  // ═══════════════════════════════════════════════════════════════

  // Wait for navigation to complete
  try {
    await page.waitForURL(
      /\/(products\/(homepage|particularcategorypage)|session-page\/session-listing|session-page\/)/,
      { timeout: 30_000 }
    );
  } catch (error) {
    console.log("Navigation completed. Current URL:", page.url());
  }

  // If we're on session listing, navigate to cart
  if (page.url().includes("session-listing")) {
    const goToCartButton = page
      .getByRole("button", { name: "Go to cart" })
      .first();

    const isVisible = await goToCartButton
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (isVisible) {
      console.log("Going to cart from session listing...");
      await goToCartButton.click();
      await page.waitForURL(/\/products\//, { timeout: 30_000 });
    }
  }

  // If we landed on homepage, click cart icon in left nav to reach table layout
  if (page.url().includes("/products/homepage")) {
    console.log("On homepage — clicking cart icon to navigate to table layout...");
    const cartNavBtn = page.locator('[role="button"].MuiListItemButton-root').first();
    if (await cartNavBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cartNavBtn.click();
      await page.waitForURL(/\/products\/particularcategorypage/, { timeout: 15_000 }).catch(async () => {
        await page.goto("/products/particularcategorypage");
        await page.waitForLoadState("domcontentloaded");
      });
    } else {
      await page.goto("/products/particularcategorypage");
      await page.waitForLoadState("domcontentloaded");
    }
  }

  // Verify we're authenticated
  await expect(page).toHaveURL(
    /\/products\/(homepage|particularcategorypage)|\/session-page\/session-listing|\/session-page\//,
    { timeout: 30_000 }
  );

  console.log("Authentication complete. Final URL:", page.url());

  // ═══════════════════════════════════════════════════════════════
  // STEP 8: Save authentication state for both test suites
  // ═══════════════════════════════════════════════════════════════

  // Save for smoke tests
  await page.context().storageState({ path: "auth-state.json" });
  console.log("Auth state saved to auth-state.json");

  // Save for sanity tests (same state, different file for clarity)
  await page.context().storageState({ path: "advanced-auth-state.json" });
  console.log("Auth state saved to advanced-auth-state.json");

  console.log("✓ Single authentication setup complete!");
});
