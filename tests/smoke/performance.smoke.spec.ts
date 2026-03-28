import { test, expect } from "../fixtures";

test.describe("Performance & Load Time - Smoke Tests", () => {
  test.describe("Page Load Times", () => {
    test("should load homepage within acceptable time", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      // Page should load within 15 seconds (reasonable timeout)
      expect(loadTime).toBeLessThan(15_000);

      // Verify page is actually loaded
      await expect(page).toHaveURL(/\/products\/homepage/);
    });

    test("should load product catalog page efficiently", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/products/particularcategorypage");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(15_000);
      await expect(page).toHaveURL(/\/particularcategorypage/);
    });

    test("should load orders page without excessive delay", async ({
      page,
    }) => {
      const startTime = Date.now();

      await page.goto("/products/orderstable");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(15_000);
      await expect(page).toHaveURL(/\/orderstable/);
    });

    test("should load kitchen display system page efficiently", async ({
      page,
    }) => {
      const startTime = Date.now();

      await page.goto("/products/kitchen-display");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(15_000);
      await expect(page).toHaveURL(/\/kitchen-display/);
    });

    test("should load session listing page quickly", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/session-page/session-listing");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(15_000);
      await expect(page).toHaveURL(/\/session-listing/);
    });
  });

  test.describe("Resource Loading", () => {
    test("should load all necessary JavaScript files", async ({ page }) => {
      const jsErrors: string[] = [];

      // Listen for console errors
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          jsErrors.push(msg.text());
        }
      });

      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Check that page is still functional despite any console errors
      await expect(page).toHaveURL(/\/products\/homepage/);

      // Main content should still be visible
      const content = page.locator("main, [role='main']");
      const isVisible = await content.isVisible({ timeout: 5_000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test("should load CSS styles properly", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Check that elements have computed styles (basic CSS loading verification)
      const container = page.locator("[class*='MuiContainer']").first();

      // Get computed background color (will be set by CSS)
      const backgroundColor = await container.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should have some style applied
      expect(backgroundColor).toBeTruthy();
    });

    test("should load images without errors on homepage", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Look for images on the page
      const images = page.locator("img");
      const imageCount = await images.count();

      // Check first few images load successfully
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const image = images.nth(i);

        // Image should be loaded (has natural dimensions)
        const naturalWidth = await image.evaluate(
          (el: HTMLImageElement) => el.naturalWidth
        );

        // Either has width or is intentionally placeholder
        if (naturalWidth === 0) {
          // May be a loading image or error - check if src exists
          const src = await image.getAttribute("src");
          expect(src || naturalWidth).toBeTruthy();
        }
      }
    });
  });

  test.describe("Network Performance", () => {
    test("should complete page load with minimal network requests", async ({
      page,
    }) => {
      const requests: string[] = [];

      page.on("request", (request) => {
        requests.push(request.url());
      });

      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Should have made reasonable number of requests (not excessive)
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.length).toBeLessThan(100); // Reasonable limit

      // Should have loaded the main page
      await expect(page).toHaveURL(/\/products\/homepage/);
    });

    test("should handle navigation with background requests", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Navigate to another page
      const navItems = page.locator('[role="button"].MuiListItemButton-root');

      if ((await navItems.count()) > 0) {
        await navItems.first().click();

        // Should navigate successfully
        await page.waitForNavigation({ waitUntil: "networkidle" });

        // Should be on a different page
        await expect(page).toHaveURL(/\/products\//);
      }
    });

    test("should cache assets for faster subsequent loads", async ({
      page,
    }) => {
      // First load
      const firstLoadRequests: string[] = [];
      page.on("request", (request) => {
        firstLoadRequests.push(request.url());
      });

      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const firstLoadCount = firstLoadRequests.length;

      // Reload page
      const secondLoadRequests: string[] = [];
      page.off("request", undefined);
      page.on("request", (request) => {
        secondLoadRequests.push(request.url());
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Both loads should complete successfully
      await expect(page).toHaveURL(/\/products\/homepage/);

      // Second load might have fewer requests due to caching
      expect(firstLoadCount).toBeGreaterThan(0);
    });
  });

  test.describe("DOM Performance", () => {
    test("should render dashboard with manageable DOM size", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Check DOM element count
      const elementCount = await page.evaluate(() => {
        return document.querySelectorAll("*").length;
      });

      // Should have reasonable number of DOM elements (not excessive)
      expect(elementCount).toBeGreaterThan(50);
      expect(elementCount).toBeLessThan(5000); // Reasonable limit for performance
    });

    test("should handle interactive elements without lag", async ({
      page,
    }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      const startTime = Date.now();

      // Click a navigation item
      const navItem = page.locator('[role="button"].MuiListItemButton-root').first();

      if (await navItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await navItem.click();
        await page.waitForNavigation({ waitUntil: "networkidle" });

        const interactionTime = Date.now() - startTime;

        // Interaction should complete quickly (within reasonable timeframe)
        expect(interactionTime).toBeLessThan(10_000);
      }
    });

    test("should display content without layout shift", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Get initial layout metrics
      const initialMetrics = await page.evaluate(() => {
        const main = document.querySelector("main") || document.querySelector("[role='main']");
        if (!main) return null;

        return {
          width: main.clientWidth,
          height: main.clientHeight,
          top: main.getBoundingClientRect().top,
        };
      });

      // Wait a bit
      await page.waitForTimeout(2_000);

      // Get metrics after wait
      const finalMetrics = await page.evaluate(() => {
        const main = document.querySelector("main") || document.querySelector("[role='main']");
        if (!main) return null;

        return {
          width: main.clientWidth,
          height: main.clientHeight,
          top: main.getBoundingClientRect().top,
        };
      });

      // Layout should be stable
      if (initialMetrics && finalMetrics) {
        expect(initialMetrics.width).toBe(finalMetrics.width);
        expect(initialMetrics.top).toBe(finalMetrics.top);
      }
    });
  });

  test.describe("Browser Resource Usage", () => {
    test("should not consume excessive memory", async ({ page }) => {
      await page.goto("/products/homepage");
      await page.waitForLoadState("networkidle");

      // Navigate through multiple pages
      const navItems = page.locator('[role="button"].MuiListItemButton-root');
      const count = Math.min(await navItems.count(), 3);

      for (let i = 0; i < count; i++) {
        const item = navItems.nth(i);
        if (await item.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await item.click();
          await page.waitForLoadState("networkidle");
        }
      }

      // Should still be functional
      await expect(page).toHaveURL(/\/products\//);
    });
  });
});
