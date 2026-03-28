import { test, expect } from "../fixtures";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Release Tables
 *
 * Iterates through EVERY table card on the layout one by one:
 *   Grey  → skip
 *   Red / Green / Yellow → enter cart, then:
 *     Cart has "Skip Print Bill"  → click it, wait, then Record Payment flow
 *     Cart has "Record Payment" only → Record Payment flow directly
 *     Cart has neither             → empty cart → click release icon in right
 *                                    sidebar → confirm "Yes" on modal
 *
 * Repeats passes until all tables are grey (max 5 passes).
 */

const BASE_URL = process.env.BASE_URL || "https://upcoming-pos.palletnow.co";
const TABLE_LAYOUT_URL = `${BASE_URL}/products/particularcategorypage`;

const COLORS = {
  available:      "rgb(234, 236, 239)", // grey       — skip
  occupied:       "rgb(255, 99, 99)",   // red        — occupied, no orders
  orderPlaced:    "rgb(78, 238, 188)",  // green      — order placed, unpaid
  paymentPending: "rgb(243, 213, 105)", // yellow     — payment pending
  closedOrder:    "rgb(255, 200, 197)", // light pink — payment done, needs release
};
const TARGET_COLORS = [
  COLORS.occupied,
  COLORS.orderPlaced,
  COLORS.paymentPending,
  COLORS.closedOrder,
];

// ── helpers ───────────────────────────────────────────────────────────────────

function colorInfo(rgb: string): { state: string; colorName: string } {
  switch (rgb) {
    case COLORS.occupied:       return { state: "Occupied",        colorName: "Red"        };
    case COLORS.orderPlaced:    return { state: "Order Placed",    colorName: "Green"      };
    case COLORS.paymentPending: return { state: "Payment Pending", colorName: "Yellow"     };
    case COLORS.closedOrder:    return { state: "Closed Order",    colorName: "Light Pink" };
    default:                    return { state: "Unknown",         colorName: rgb          };
  }
}

async function resolveCartId(page: any): Promise<string> {
  const res = await page.waitForResponse(
    (r: any) => r.url().includes("/cart/filter") && r.status() === 200,
    { timeout: 10_000 }
  ).catch(() => null);
  if (!res) return "(not received)";
  const body = await res.json().catch(() => null);
  const id = body?.data?.results?.[0]?.cartId;
  return id ? String(id) : "(not received)";
}

async function goToTableLayout(page: any) {
  await page.goto(TABLE_LAYOUT_URL);
  await page.waitForLoadState("domcontentloaded");
  const visible = await page
    .locator(".tableStructureBoard")
    .isVisible({ timeout: 10_000 })
    .catch(() => false);
  if (!visible) {
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  }
  await expect(page.locator(".tableStructureBoard")).toBeVisible({ timeout: 15_000 });
}

async function backToTableLayout(page: any) {
  const selectBtn = page
    .locator(".complimentoryCratWrapper")
    .filter({ hasText: "Select Table" });
  if (await selectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await selectBtn.evaluate((el: HTMLElement) =>
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    );
    await page.waitForTimeout(1_500);
  } else {
    await goToTableLayout(page);
  }
  if (
    !(await page
      .locator(".tableStructureBoard")
      .isVisible({ timeout: 8_000 })
      .catch(() => false))
  ) {
    await goToTableLayout(page);
  }
}

async function readCartTotal(page: any): Promise<string> {
  const totalBtn = page.locator(".cartTotalArrowButton");
  if (await totalBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const text = await totalBtn.textContent().catch(() => "");
    const match = text?.match(/[\d,]+\.?\d*/);
    if (match) return match[0].replace(/,/g, "");
  }
  const bottomSection = page.locator(".cartBottomSectionWrapper");
  if (await bottomSection.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const text = await bottomSection.textContent().catch(() => "");
    const matches = text?.match(/[\d,]+\.?\d*/g);
    if (matches?.length) return matches[matches.length - 1].replace(/,/g, "");
  }
  return "";
}

// ── payment flow ──────────────────────────────────────────────────────────────

async function doPaymentFlow(page: any, tableNum: string): Promise<boolean> {
  const cartTotal = await readCartTotal(page);
  console.log(`  → Cart total: "${cartTotal || "(could not read)"}"`);

  // Step 1: Skip Print Bill if visible
  const skipPrintBtn = page
    .locator("button")
    .filter({ hasText: /skip.*print|skip.*bill/i })
    .first();
  if (await skipPrintBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipPrintBtn.click();
    console.log(`  → Clicked 'Skip Print Bill' — waiting for Record Payment...`);
    await page.waitForTimeout(4_000);
  }

  // Step 2: Record Payment
  const recordPayBtn = page
    .locator("button")
    .filter({ hasText: /record\s*payment/i })
    .first();
  if (!(await recordPayBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
    console.log(`  → 'Record Payment' button not found.`);
    return false;
  }
  await recordPayBtn.click();
  console.log(`  → Clicked 'Record Payment'.`);
  await page.waitForTimeout(1_500);

  // Step 3: Fill Amount (if an input field is present)
  // For 0.00 totals the modal may auto-confirm with no input required.
  const amountInput = page
    .locator(
      '[role="dialog"] input, .MuiModal-root input, ' +
      '[role="presentation"] input'
    )
    .first();

  const inputVisible = await amountInput.isVisible({ timeout: 4_000 }).catch(() => false);
  if (inputVisible) {
    await amountInput.click();
    await page.keyboard.press("Control+a");
    await amountInput.fill(cartTotal || "0");
    console.log(`  → Entered amount: ${cartTotal || "0"}`);
    await page.waitForTimeout(500);
  } else {
    console.log(`  → No amount input found (total=${cartTotal}) — proceeding directly to Pay.`);
  }

  // Step 4: Pay
  const payBtn = page
    .locator('[role="dialog"] button, .MuiModal-root button')
    .filter({ hasText: /^pay$/i })
    .first();
  const payBtnAlt = page
    .locator('[role="dialog"] button, .MuiModal-root button')
    .filter({ hasText: /pay/i })
    .first();
  if (await payBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await payBtn.click();
  } else if (await payBtnAlt.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await payBtnAlt.click();
  } else {
    console.log(`  → Pay button not found.`);
    await page.keyboard.press("Escape");
    return false;
  }
  console.log(`  → Clicked Pay.`);
  await page.waitForTimeout(1_000);

  // Step 5: Continue
  const continueBtn = page.locator("button").filter({ hasText: /^continue$/i }).first();
  const continueBtnAlt = page.locator("button").filter({ hasText: /continue/i }).first();
  if (await continueBtn.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await continueBtn.click();
  } else if (await continueBtnAlt.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await continueBtnAlt.click();
  } else {
    console.log(`  → 'Continue' did not appear.`);
    return false;
  }
  console.log(`  → Clicked Continue.`);
  await page.waitForTimeout(2_000);
  return true;
}

// ── release flow ──────────────────────────────────────────────────────────────

/**
 * Releases a table with an empty cart.
 *
 * The release control is a div.rightSidebarButtonContainer (NOT a <button>),
 * with a <p class="rightSidebarButtonText"> that reads "Release Table".
 */
async function doReleaseFlow(page: any, tableNum: string): Promise<boolean> {
  console.log(`  → Empty cart — clicking Release Table in right sidebar.`);

  const releaseBtn = page
    .locator(".rightSidebarButtonContainer")
    .filter({ hasText: /release/i })
    .first();

  if (!(await releaseBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log(`  → Release Table button not found in sidebar.`);
    return false;
  }

  await releaseBtn.click();
  await page.waitForTimeout(800);

  const modal = page
    .locator('[role="dialog"], [role="presentation"].MuiModal-root')
    .first();
  if (!(await modal.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log(`  → Release confirm modal did not appear.`);
    return false;
  }

  return await confirmReleaseModal(page, tableNum);
}

async function confirmReleaseModal(page: any, tableNum: string): Promise<boolean> {
  const yesRelease = page
    .locator("button, [role='button']")
    .filter({ hasText: /yes.*release|release.*yes/i })
    .first();
  const yesExact = page
    .locator('[role="dialog"] button, [role="presentation"].MuiModal-root button')
    .filter({ hasText: /^yes$/i })
    .first();
  const yesAny = page
    .locator('[role="dialog"] button, [role="presentation"].MuiModal-root button')
    .filter({ hasText: /yes/i })
    .first();

  if (await yesRelease.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await yesRelease.click();
  } else if (await yesExact.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await yesExact.click();
  } else if (await yesAny.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await yesAny.click();
  } else {
    await page.keyboard.press("Escape");
    return false;
  }

  console.log(`  ✓ Table ${tableNum} released.`);
  await page.waitForTimeout(1_500);
  return true;
}

// ── main test ─────────────────────────────────────────────────────────────────

test.describe("Release Tables", () => {
  test.setTimeout(600_000); // 10 minutes

  test("should clear all occupied and ordered tables from the floor", async ({
    page,
  }) => {
    await goToTableLayout(page);

    let paidCount     = 0;
    let releasedCount = 0;
    const skippedTables: string[] = [];
    const MAX_PASSES = 5;

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      await goToTableLayout(page);

      // Snapshot every table card on the layout (by index, not by color)
      const allCards = page.locator(".tableStyle");
      const totalCards = await allCards.count();
      console.log(`\n[Pass ${pass}] ${totalCards} table card(s) on layout.`);

      let activeThisPass = 0;

      for (let idx = 0; idx < totalCards; idx++) {
        // Read color and number for this card
        const card  = allCards.nth(idx);
        const color = await card
          .evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor)
          .catch(() => COLORS.available);
        const tableNum = (
          await card.locator("p").first().textContent().catch(() => null)
        )?.trim() || `#${idx}`;

        // Grey → skip silently
        if (!TARGET_COLORS.includes(color)) continue;

        // Already on skip-list → skip
        if (skippedTables.includes(tableNum)) {
          console.log(`\n  [Table ${tableNum}] On skip-list — ignoring.`);
          continue;
        }

        activeThisPass++;
        const { state, colorName } = colorInfo(color);
        console.log(`\n  [Table ${tableNum}] State: ${state} | Color: ${colorName}`);

        // Navigate to table layout before each click (ensures fresh state)
        await goToTableLayout(page);

        // Re-read after navigation (color may have changed)
        const freshColor = await page
          .locator(".tableStyle")
          .nth(idx)
          .evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor)
          .catch(() => COLORS.available);
        if (!TARGET_COLORS.includes(freshColor)) {
          console.log(`  → Table ${tableNum} is now grey — skipping.`);
          continue;
        }

        // Dismiss any stray overlay before clicking the table card
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Set up cart ID capture before clicking
        const cartIdPromise = resolveCartId(page);

        // Click the table card — use dispatchEvent to bypass MUI overlay intercepts
        await page.locator(".tableStyle").nth(idx).dispatchEvent("click");
        await page.waitForTimeout(1_500);

        // Verify we reached the cart
        const onCart =
          (page.url().includes("/products/") &&
            !page.url().includes("particularcategorypage")) ||
          (await page
            .locator(".cartAndSidebarContainer")
            .isVisible({ timeout: 5_000 })
            .catch(() => false));

        if (!onCart) {
          console.log(`  → Cart not reached — skipping table ${tableNum}.`);
          skippedTables.push(tableNum);
          continue;
        }

        const cartId = await cartIdPromise;
        const { state: freshState, colorName: freshColorName } = colorInfo(freshColor);
        console.log(`  → Table: ${tableNum} | State: ${freshState} | Color: ${freshColorName} | Cart ID: ${cartId}`);

        // ── Decide: payment or release ─────────────────────────────────
        const skipPrintBtn = page
          .locator("button")
          .filter({ hasText: /skip.*print|skip.*bill/i })
          .first();
        const recordPayBtn = page
          .locator("button")
          .filter({ hasText: /record\s*payment/i })
          .first();

        const hasSkipPrint = await skipPrintBtn.isVisible({ timeout: 3_000 }).catch(() => false);
        const hasRecordPay = hasSkipPrint
          ? true
          : await recordPayBtn.isVisible({ timeout: 3_000 }).catch(() => false);

        if (!hasSkipPrint && !hasRecordPay) {
          // ── Release (empty cart) ──────────────────────────────────────
          const released = await doReleaseFlow(page, tableNum);
          if (released) {
            releasedCount++;
          } else {
            skippedTables.push(tableNum);
            await backToTableLayout(page);
          }
        } else {
          // ── Payment (orders present) ──────────────────────────────────
          const paid = await doPaymentFlow(page, tableNum);
          if (paid) {
            paidCount++;
          } else {
            skippedTables.push(tableNum);
            await backToTableLayout(page);
          }
        }

        // Return to table layout before next card
        if (
          !(await page
            .locator(".tableStructureBoard")
            .isVisible({ timeout: 8_000 })
            .catch(() => false))
        ) {
          await goToTableLayout(page);
        }
      }

      if (activeThisPass === 0) {
        console.log(`\n[Pass ${pass}] No active tables found — floor is clear.`);
        break;
      }
      console.log(`\n[Pass ${pass}] Complete. Active tables processed this pass: ${activeThisPass}.`);
    }

    // ── Summary ───────────────────────────────────────────────────────────
    console.log(`
══ Summary ══
  Paid & cleared : ${paidCount}
  Released       : ${releasedCount}
  Skipped        : ${skippedTables.length}${skippedTables.length ? ` (${skippedTables.join(", ")})` : ""}
    `);

    // Final check: all non-skipped tables should now be grey
    await goToTableLayout(page);
    const allCards   = page.locator(".tableStyle");
    const totalCards = await allCards.count();
    const stillActive: string[] = [];

    for (let idx = 0; idx < totalCards; idx++) {
      const color = await allCards
        .nth(idx)
        .evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor)
        .catch(() => COLORS.available);
      if (!TARGET_COLORS.includes(color)) continue;
      const num = (
        await allCards.nth(idx).locator("p").first().textContent().catch(() => null)
      )?.trim() || `#${idx}`;
      if (!skippedTables.includes(num)) stillActive.push(num);
    }

    if (stillActive.length > 0) {
      console.log(`Still active (non-skipped): ${stillActive.join(", ")}`);
    }
    expect(stillActive).toHaveLength(0);
  });
});
