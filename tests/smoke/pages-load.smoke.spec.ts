import { test, expect } from "../fixtures";
import { PAGES } from "../fixtures/pages";

test.describe("All Pages Load - Smoke Tests", () => {
  for (const pageDef of PAGES) {
    test(`should load "${pageDef.name}" page at ${pageDef.route}`, async ({
      page,
    }) => {
      const response = await page.goto(pageDef.route, {
        timeout: pageDef.timeout ?? 30_000,
      });
      await page.waitForLoadState("networkidle");

      // Verify the page loaded without a server error
      expect(response?.status()).toBeLessThan(500);

      // Verify expected content is visible
      if (pageDef.expectedText) {
        await expect(
          page.getByText(pageDef.expectedText).first()
        ).toBeVisible({ timeout: 15_000 });
      }

      if (pageDef.expectedSelector) {
        // Try each selector (comma-separated) until one matches
        const selectors = pageDef.expectedSelector.split(",").map((s) => s.trim());
        let found = false;
        for (const selector of selectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 5_000 }).catch(() => false)) {
            found = true;
            break;
          }
        }
        expect(found).toBeTruthy();
      }

      // Verify no "Page not found" or error state
      const body = await page.locator("body").textContent();
      expect(body).not.toContain("Page not found");
      expect(body).not.toContain("Oops !");
    });
  }
});
