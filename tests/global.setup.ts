import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

/**
 * Global Setup — runs ONCE before any browser opens.
 * Authenticates headlessly and saves session state files so the
 * main test browser (opened by the all-tests project) can reuse them.
 *
 * Skips the full login flow if auth-state.json exists and is less than
 * 2 hours old — the saved session is still valid.
 */
export default async function globalSetup() {
  const username = process.env.POS_USERNAME || "7872735817";
  const pin = process.env.POS_PIN || "1111";
  const baseURL =
    process.env.BASE_URL || "https://upcoming-pos.palletnow.co";

  // ── Fast path: reuse existing auth state if it is fresh (< 2 hours) ───────
  const authFile = "auth-state.json";
  if (fs.existsSync(authFile)) {
    const ageMs = Date.now() - fs.statSync(authFile).mtimeMs;
    if (ageMs < 3 * 60 * 60 * 1000) {
      console.log(`[globalSetup] auth-state.json is ${Math.round(ageMs / 60000)}m old — reusing, skipping login.`);
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (!username || !pin) {
    throw new Error(
      "Missing POS_USERNAME or POS_PIN in environment variables. Check your .env file."
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Already authenticated
    if (page.url().includes("/products/")) {
      console.log("[globalSetup] Already authenticated.");
      await context.storageState({ path: "auth-state.json" });
      await context.storageState({ path: "advanced-auth-state.json" });
      return;
    }

    // Fill login form
    await page
      .getByPlaceholder("Mobile Number")
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();

    console.log("[globalSetup] Login submitted...");

    await page.waitForURL(
      /\/(products\/(location|homepage|particularcategorypage)|session-page)/,
      { timeout: 30_000 }
    );

    // Landed on authenticated page — skip location/terminal steps
    if (
      page.url().includes("/products/homepage") ||
      page.url().includes("/products/particularcategorypage")
    ) {
      if (page.url().includes("/products/homepage")) {
        const cartNavBtn = page
          .locator('[role="button"].MuiListItemButton-root')
          .first();
        if (await cartNavBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await cartNavBtn.click();
          await page
            .waitForURL(/\/products\/particularcategorypage/, { timeout: 15_000 })
            .catch(async () => {
              await page.goto("/products/particularcategorypage");
              await page.waitForLoadState("domcontentloaded");
            });
        } else {
          await page.goto("/products/particularcategorypage");
          await page.waitForLoadState("domcontentloaded");
        }
      }
      await context.storageState({ path: "auth-state.json" });
      await context.storageState({ path: "advanced-auth-state.json" });
      return;
    }

    // Location selection
    if (page.url().includes("/products/location")) {
      await page
        .getByText("Select Location")
        .waitFor({ state: "visible", timeout: 10_000 })
        .catch(() => {});
      await page.locator('[class*="dropdown"]').first().click();
      await page.waitForTimeout(500);
      await page.locator('text="canteen"').first().click();
      await page.waitForTimeout(500);
      await page.locator('text="CANTEEN _ TEST"').first().click();
    }

    // Terminal selection
    await page
      .waitForURL(/\/session-page\/(start-day|start|opening)/, {
        timeout: 15_000,
      })
      .catch(() => {});

    const startDayBtn = page.getByRole("button", { name: /start day/i });
    if (await startDayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await startDayBtn.click();
      await page.waitForTimeout(3_000);
    }

    if (
      await page
        .getByText("Select Terminal")
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await page.locator('[class*="dropdown"]').first().click();
      await page.waitForTimeout(500);
      await page.locator('text="Terminal 1"').first().click();
      await page.getByRole("button", { name: "Start session" }).click();
    }

    // Cash amount
    if (
      await page
        .getByText("Cash amount")
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await page.getByPlaceholder("Enter cash amount").fill("1");
      await page.getByRole("button", { name: "Login as manager" }).click();
    }

    // Final navigation
    await page
      .waitForURL(
        /\/(products\/(homepage|particularcategorypage)|session-page\/session-listing|session-page\/)/,
        { timeout: 30_000 }
      )
      .catch(() => {});

    if (page.url().includes("session-listing")) {
      const goToCart = page
        .getByRole("button", { name: "Go to cart" })
        .first();
      if (await goToCart.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await goToCart.click();
        await page.waitForURL(/\/products\//, { timeout: 30_000 }).catch(() => {});
      }
    }

    if (page.url().includes("/products/homepage")) {
      const cartNavBtn = page
        .locator('[role="button"].MuiListItemButton-root')
        .first();
      if (await cartNavBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await cartNavBtn.click();
        await page
          .waitForURL(/\/products\/particularcategorypage/, { timeout: 15_000 })
          .catch(async () => {
            await page.goto("/products/particularcategorypage");
            await page.waitForLoadState("domcontentloaded");
          });
      } else {
        await page.goto("/products/particularcategorypage");
        await page.waitForLoadState("domcontentloaded");
      }
    }

    // Ensure we land on the products page before saving auth state.
    // "Login as manager" can redirect to root (/), session-listing, or homepage.
    if (!page.url().includes("/products/")) {
      await page.goto(`${baseURL}/products/particularcategorypage`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2_000);
    }

    console.log("[globalSetup] Auth complete. URL:", page.url());

    await context.storageState({ path: "auth-state.json" });
    await context.storageState({ path: "advanced-auth-state.json" });
    console.log("[globalSetup] State saved to auth-state.json and advanced-auth-state.json");
  } finally {
    await browser.close();
  }
}
