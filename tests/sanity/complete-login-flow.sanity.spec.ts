import { test, expect } from "../fixtures";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Sanity Tests: Complete Login Flow
 *
 * The full login journey runs ONCE in beforeAll (one Chrome window):
 *   Step 1: Enter login credentials (Mobile Number + PIN)
 *   Step 2: Select location (CANTEEN → Sakura Cafe)
 *   Step 3: Select terminal (TestPos-1)
 *   Step 4: Enter cash amount (1)
 *   Step 5: Login as manager
 *   Step 6: Navigate to cart/product page
 *
 * All test cases then verify outcomes from the authenticated state.
 */

test.describe("Complete Login Flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ sharedContext }) => {
    // Extend timeout for the full login flow
    test.setTimeout(120_000);

    const pages = sharedContext.pages();
    const page = pages.length > 0 ? pages[0] : await sharedContext.newPage();

    // Navigate to the app first so localStorage is cleared on the correct origin
    await page.goto("/", { timeout: 60_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await sharedContext.clearCookies();

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Reload to unauthenticated login page
    // ═══════════════════════════════════════════════════════════════
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const mobileInput = page.getByPlaceholder("Mobile Number");
    const pinInput = page.getByPlaceholder("Pin");
    const loginButton = page.getByRole("button", { name: "LOGIN" });

    await expect(mobileInput).toBeVisible({ timeout: 20_000 });
    await expect(pinInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    await mobileInput.fill(process.env.POS_USERNAME || "7872735817");
    await pinInput.fill(process.env.POS_PIN || "1111");

    await expect(mobileInput).toHaveValue(process.env.POS_USERNAME || "7872735817");
    await expect(pinInput).toHaveValue(process.env.POS_PIN || "1111");

    await loginButton.click();

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Select Location (CANTEEN → Sakura Cafe)
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(/\/products\/location/, { timeout: 30_000 });
    await expect(page.getByText("Select Location")).toBeVisible({ timeout: 10_000 });

    // Expand the locations list then select location
    await page.locator('[class*="dropdown"]').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text="canteen"').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('text="canteen"').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text="CANTEEN _ TEST"').first()).toBeVisible({ timeout: 5_000 });
    await page.locator('text="CANTEEN _ TEST"').first().click();

    // ═══════════════════════════════════════════════════════════════
    // STEP 3–6: Handle post-location navigation (conditional)
    // Depending on session state, the app may land on:
    //   - /session-page/start-day   → full terminal/cash/manager flow
    //   - /session-page/session-listing → click Go to cart
    //   - /products/homepage        → navigate to cart directly
    //   - /products/particularcategorypage → already done
    // ═══════════════════════════════════════════════════════════════
    await page.waitForURL(
      /\/(session-page\/(start-day|session-listing)|products\/(homepage|particularcategorypage))/,
      { timeout: 30_000 }
    );

    const landedURL = page.url();

    if (landedURL.includes("/session-page/start-day")) {
      // Terminal selection
      await expect(page.getByText("Select Terminal", { exact: true })).toBeVisible({ timeout: 10_000 });
      await page.locator('[class*="dropdown"]').first().click();
      await expect(page.locator('text="Terminal 1"').first()).toBeVisible({ timeout: 5_000 });
      await page.locator('text="Terminal 1"').first().click();
      await page.getByRole("button", { name: "Start session" }).click();

      // Cash amount
      await page.waitForURL(/\/session-page\/opening/, { timeout: 30_000 });
      const cashAmountInput = page.getByPlaceholder("Enter cash amount");
      await expect(cashAmountInput).toBeVisible({ timeout: 10_000 });
      await cashAmountInput.fill("1");

      // Login as manager
      const loginAsManagerButton = page.getByRole("button", { name: "Login as manager" });
      await expect(loginAsManagerButton).toBeVisible();
      await loginAsManagerButton.click();

      // Go to cart from session listing
      await page.waitForURL(/\/session-page\/session-listing/, { timeout: 30_000 });
      const goToCartButton = page.getByRole("button", { name: "Go to cart" });
      await expect(goToCartButton).toBeVisible({ timeout: 10_000 });
      await goToCartButton.click();
      await page.waitForURL(/\/products\/particularcategorypage/, { timeout: 30_000 });

    } else if (landedURL.includes("/session-page/session-listing")) {
      const goToCartButton = page.getByRole("button", { name: "Go to cart" });
      await expect(goToCartButton).toBeVisible({ timeout: 10_000 });
      await goToCartButton.click();
      await page.waitForURL(/\/products\/particularcategorypage/, { timeout: 30_000 });

    } else if (landedURL.includes("/products/homepage")) {
      // Click cart icon from left navigation bar to reach table layout
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
    // else: already on /products/particularcategorypage — nothing to do
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-CLF-01: Cart page should have table elements and nav bar after login
  // ─────────────────────────────────────────────────────────────────────────
  test("should land on cart page with table layout and nav bar", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/particularcategorypage/);

    // Verify product catalog is loaded (categories are always present)
    const categories = page.locator('[class*="category"], ul li, [class*="Categories"]').first();
    await expect(categories).toBeVisible({ timeout: 10_000 });

    // Verify bottom nav bar is present
    const navBar = page.locator('text="Returns"').or(page.locator('text="Sessions"')).first();
    await expect(navBar).toBeVisible({ timeout: 10_000 });

    // Verify cart panel is present
    const cartPanel = page.locator('text="Select Table"').or(page.locator('text="Your Cart is empty"')).first();
    await expect(cartPanel).toBeVisible({ timeout: 10_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-CLF-02: Session should persist after navigating away and back
  // ─────────────────────────────────────────────────────────────────────────
  test("should maintain session after navigation", async ({ page }) => {
    await expect(page).toHaveURL(/\/products\/particularcategorypage/);

    const menuButton = page.getByRole("button", { name: "Menu" });
    if (await menuButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await menuButton.click();
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(page).toHaveURL(/\/products\//);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-CLF-03: Session listing page should load with Active Sessions heading
  // ─────────────────────────────────────────────────────────────────────────
  test("should show active session in session listing", async ({ page }) => {
    await page.goto("/session-page/session-listing");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText("Active Sessions", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Navigate to table layout and verify the table layout board is visible
    await page.goto("/products/particularcategorypage");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".tableStructureBoard")).toBeVisible({ timeout: 15_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-CLF-04: Cart page should remain accessible after login flow
  // ─────────────────────────────────────────────────────────────────────────
  test("should navigate to cart page after login", async ({ page }) => {
    await page.goto("/products/particularcategorypage");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/products\/particularcategorypage/, {
      timeout: 30_000,
    });

    const navBar = page.locator('text="Returns"').or(page.locator('text="Sessions"')).first();
    await expect(navBar).toBeVisible({ timeout: 10_000 });
  });
});
