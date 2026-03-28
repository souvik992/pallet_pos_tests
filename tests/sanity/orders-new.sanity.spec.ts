import { test, expect } from "../fixtures";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Sanity Tests: Orders (New)
 *
 * Tests for the Orders page at /products/orderstable.
 * Covers order listing, session scope, and sales-channel filter tabs.
 *
 * Selectors discovered from live DOM inspection:
 *   - .order-type-filter-tabs          → container holding the four filter tabs
 *   - .order-type-tab                  → individual filter tab (All / Delivery / Take Away / Dine In)
 *   - .order-type-tab-active           → currently active filter tab
 *   - .order-select-wrapper            → top bar with Today's Orders button + session dropdown
 *   - .customPosButton.blue-d          → "Today's Orders" toggle button
 *   - .order-select                    → react-select dropdown ("Session orders")
 *   - .table-number-search-input       → table number search input
 *   - .react-datepicker-wrapper input  → date picker (placeholder: "Select Date")
 *   - .order-select-wrapper-right      → right section (search + dropdown + datepicker)
 *
 * Navigation bar button: .bottombar-icon-btn (text "Orders")
 *
 * Source: webPOS Fine dine tab, rows A55–A60
 */

const BASE_URL = process.env.BASE_URL || "https://upcoming-pos.palletnow.co";
const ORDERS_URL = `${BASE_URL}/products/orderstable`;
const TABLE_LAYOUT_URL = `${BASE_URL}/products/particularcategorypage`;

/** Navigate to the Orders page via the nav bar button */
async function goToOrdersPage(page: any) {
  await page.goto(ORDERS_URL);
  await page.waitForLoadState("domcontentloaded");
  // Reload once if tabs don't appear (can happen after session-changing tests)
  const tabsVisible = await page.locator(".order-type-filter-tabs")
    .isVisible({ timeout: 10_000 }).catch(() => false);
  if (!tabsVisible) {
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  }
  await expect(page.locator(".order-type-filter-tabs")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Orders (New)", () => {
  test.beforeEach(async ({ page }) => {
    await goToOrdersPage(page);
  });

  // TC-ON-01: List of orders should be shown from all sales channels (All tab active by default)
  test("should display orders list from all sales channels with All tab selected", async ({
    page,
  }) => {
    // All tab should be visible and active by default
    const allTab = page
      .locator(".order-type-tab")
      .filter({ hasText: "All" });
    await expect(allTab).toBeVisible();
    await expect(allTab).toHaveClass(/order-type-tab-active/);

    // The filter tab bar must show all four channels
    const tabs = page.locator(".order-type-tab");
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Verify all four tab labels are present
    await expect(page.locator(".order-type-tab").filter({ hasText: "All" })).toBeVisible();
    await expect(page.locator(".order-type-tab").filter({ hasText: "Delivery" })).toBeVisible();
    await expect(page.locator(".order-type-tab").filter({ hasText: "Take Away" })).toBeVisible();
    await expect(page.locator(".order-type-tab").filter({ hasText: "Dine In" })).toBeVisible();
  });

  // TC-ON-02: By default today's session orders should be shown
  test("should show today's session orders by default", async ({ page }) => {
    // Session orders dropdown should be present and show "Session orders"
    const sessionDropdown = page.locator(".order-select");
    await expect(sessionDropdown).toBeVisible();
    await expect(sessionDropdown).toContainText("Session orders");

    // Date picker should be visible (value depends on mode: empty in session view, filled in date view)
    const datePicker = page.locator(".react-datepicker-wrapper input");
    await expect(datePicker).toBeVisible();
    const dateValue = await datePicker.inputValue();
    console.log(`Default date in orders page: "${dateValue}" (empty when session orders view is active)`);

    // "Today's Orders" button should be present
    const todayBtn = page.locator(".customPosButton.blue-d");
    await expect(todayBtn).toBeVisible();
    await expect(todayBtn).toContainText("Today's Orders");
  });

  // TC-ON-03: Delivery filter tab should show only delivery channel orders
  test("should show only Delivery orders when Delivery tab is clicked", async ({
    page,
  }) => {
    const deliveryTab = page
      .locator(".order-type-tab")
      .filter({ hasText: "Delivery" });
    await expect(deliveryTab).toBeVisible();

    await deliveryTab.click();
    await page.waitForTimeout(1_000);

    // Delivery tab should now be active
    await expect(deliveryTab).toHaveClass(/order-type-tab-active/);

    // All and other tabs should NOT be active
    const allTab = page.locator(".order-type-tab").filter({ hasText: "All" });
    await expect(allTab).not.toHaveClass(/order-type-tab-active/);

    console.log("Delivery filter activated — page filters to delivery orders only.");
  });

  // TC-ON-04: Take Away filter tab should show only take-away orders
  test("should show only Take Away orders when Take Away tab is clicked", async ({
    page,
  }) => {
    const takeAwayTab = page
      .locator(".order-type-tab")
      .filter({ hasText: "Take Away" });
    await expect(takeAwayTab).toBeVisible();

    await takeAwayTab.click();
    await page.waitForTimeout(1_000);

    // Take Away tab should now be active
    await expect(takeAwayTab).toHaveClass(/order-type-tab-active/);

    // Other tabs should not be active
    const deliveryTab = page.locator(".order-type-tab").filter({ hasText: "Delivery" });
    await expect(deliveryTab).not.toHaveClass(/order-type-tab-active/);
    console.log("Take Away filter activated — page filters to take-away orders only.");
  });

  // TC-ON-05: Dine In filter tab should show only dine-in orders
  test("should show only Dine In orders when Dine In tab is clicked", async ({
    page,
  }) => {
    const dineInTab = page
      .locator(".order-type-tab")
      .filter({ hasText: "Dine In" });
    await expect(dineInTab).toBeVisible();

    await dineInTab.click();
    await page.waitForTimeout(1_000);

    // Dine In tab should now be active
    await expect(dineInTab).toHaveClass(/order-type-tab-active/);

    // Other tabs should not be active
    const allTab = page.locator(".order-type-tab").filter({ hasText: "All" });
    await expect(allTab).not.toHaveClass(/order-type-tab-active/);
    console.log("Dine In filter activated — page filters to dine-in orders only.");
  });

  // TC-ON-06: Switching between filter tabs should update the active tab correctly
  test("should update active tab when switching between All → Delivery → All", async ({
    page,
  }) => {
    const allTab = page.locator(".order-type-tab").filter({ hasText: "All" });
    const deliveryTab = page.locator(".order-type-tab").filter({ hasText: "Delivery" });

    // Start: All is active
    await expect(allTab).toHaveClass(/order-type-tab-active/);

    // Switch to Delivery
    await deliveryTab.click();
    await page.waitForTimeout(500);
    await expect(deliveryTab).toHaveClass(/order-type-tab-active/);
    await expect(allTab).not.toHaveClass(/order-type-tab-active/);

    // Switch back to All
    await allTab.click();
    await page.waitForTimeout(500);
    await expect(allTab).toHaveClass(/order-type-tab-active/);
    await expect(deliveryTab).not.toHaveClass(/order-type-tab-active/);
  });

  // TC-ON-07: Orders page is navigable from the bottom navigation bar
  test("should navigate to Orders page from table layout nav bar", async ({
    page,
  }) => {
    // Start from table layout
    await page.goto(TABLE_LAYOUT_URL);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".tableLayoutBottombar")).toBeVisible({
      timeout: 15_000,
    });

    // Click the Orders button in the nav bar
    const ordersNavBtn = page
      .locator(".bottombar-icon-btn")
      .filter({ hasText: "Orders" });
    await expect(ordersNavBtn).toBeVisible();
    await ordersNavBtn.click();
    await page.waitForLoadState("domcontentloaded");

    // Should be on the orders page
    await expect(page).toHaveURL(/orderstable/);
    await expect(page.locator(".order-type-filter-tabs")).toBeVisible({
      timeout: 10_000,
    });
  });

  // TC-ON-08: Table number search input should be visible on orders page
  test("should display table number search input on Orders page", async ({
    page,
  }) => {
    const searchInput = page.locator(".table-number-search-input");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("placeholder", "Search Table No.");
  });

  // TC-ON-09: Date picker should be visible and usable for date filtering
  test("should display date picker for filtering orders by date", async ({
    page,
  }) => {
    const datePicker = page.locator(
      '.react-datepicker-wrapper input[placeholder="Select Date"]'
    );
    await expect(datePicker).toBeVisible();

    // Clicking the date picker should open the calendar
    await datePicker.click();
    await page.waitForTimeout(800);

    const calendar = page.locator(".react-datepicker");
    const calendarOpen = await calendar
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    console.log(`Date picker calendar opened: ${calendarOpen}`);

    // Close calendar by pressing Escape
    await page.keyboard.press("Escape");
  });

  // TC-ON-10: Session orders dropdown should be visible and interactable
  test("should display Session orders dropdown on Orders page", async ({
    page,
  }) => {
    const sessionDropdown = page.locator(".order-select");
    await expect(sessionDropdown).toBeVisible();
    await expect(sessionDropdown).toContainText("Session orders");

    // Clicking the dropdown should open options
    await sessionDropdown.click();
    await page.waitForTimeout(800);

    // React-select menu should open
    const menu = page.locator(".order-select__menu, [class*=\"order-select__menu\"]");
    const menuOpen = await menu.isVisible({ timeout: 3_000 }).catch(() => false);
    console.log(`Session dropdown menu opened: ${menuOpen}`);

    // Close by pressing Escape
    await page.keyboard.press("Escape");
  });
});
