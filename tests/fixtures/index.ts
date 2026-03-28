import { test as base, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";

/**
 * Shared-browser fixture.
 *
 * Creates ONE BrowserContext (worker-scoped) that lives for the entire
 * worker lifetime.  The `page` override is still test-scoped (Playwright
 * requirement) but always returns the *same* page from that shared context,
 * so the browser never closes and reopens between tests.
 *
 * The storage state is read from the project config (e.g. auth-state.json
 * for smoke tests, advanced-auth-state.json for sanity tests), so each
 * project gets the right authenticated session.
 *
 * Tests that need a fresh (unauthenticated) context — login, form-validation,
 * error-handling — should import directly from "@playwright/test" instead.
 */

type WorkerFixtures = {
  sharedContext: BrowserContext;
};

export const test = base.extend<{ page: Page }, WorkerFixtures>({
  // Worker-scoped: one context for all tests in this worker
  sharedContext: [
    async ({ browser }, use, workerInfo) => {
      // Use the storage state configured in the project (respects both
      // smoke → auth-state.json and sanity → advanced-auth-state.json)
      const projectStorageState = (workerInfo.project.use as { storageState?: string | object })
        .storageState;

      let storageState: string | { cookies: never[]; origins: never[] } | undefined;
      if (typeof projectStorageState === "string") {
        storageState = fs.existsSync(projectStorageState) ? projectStorageState : undefined;
      } else if (projectStorageState) {
        storageState = projectStorageState as { cookies: never[]; origins: never[] };
      }

      const context = await browser.newContext({ storageState });
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],

  // Test-scoped override: returns the existing page from the shared context
  // so the same browser window is reused for every test
  page: async ({ sharedContext }, use) => {
    const existing = sharedContext.pages();
    const page = existing.length > 0 ? existing[0] : await sharedContext.newPage();
    await use(page);
    // Intentionally do NOT close — reuse in next test
  },
});

export { expect } from "@playwright/test";
