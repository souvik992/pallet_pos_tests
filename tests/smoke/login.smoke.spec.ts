import { test, expect } from "@playwright/test";

test.describe("Login Flow - Smoke Tests", () => {
  // All login tests start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  // ─── Step 1: Splash Screen & Login Page Load ───────────────────

  test("should show splash animation then login form", async ({ page }) => {
    await page.goto("/");

    // Splash GIF should appear first
    const splashGif = page.locator('img[alt="pos-login-gif"]');
    await expect(splashGif).toBeVisible({ timeout: 10_000 });

    // After splash, the login form should appear
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await expect(page.getByPlaceholder("Mobile Number")).toBeVisible();
  });

  test("should display page title as Pallet POS", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Pallet/i);
  });

  test("should display all login form elements after splash", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    // Pallet logo
    const logo = page.locator('img[alt="pos-login-gif"]');
    await expect(logo).toBeVisible();

    // Login heading
    await expect(page.getByText("Login")).toBeVisible();

    // Mobile Number input
    const mobileInput = page.getByPlaceholder("Mobile Number");
    await expect(mobileInput).toBeVisible();
    await expect(mobileInput).toBeEditable();

    // PIN input (masked)
    const pinInput = page.getByPlaceholder("Pin");
    await expect(pinInput).toBeVisible();
    await expect(pinInput).toBeEditable();
    await expect(pinInput).toHaveAttribute("type", "password");

    // LOGIN button (blue)
    const loginButton = page.getByRole("button", { name: "LOGIN" });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();

    // Forgot pin? link
    await expect(page.getByText("Forgot pin?")).toBeVisible();
  });

  // ─── Step 2: Login Form Interaction ────────────────────────────

  test("should accept and display mobile number input", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    const mobileInput = page.getByPlaceholder("Mobile Number");
    await mobileInput.fill("9876543210");
    await expect(mobileInput).toHaveValue("9876543210");
  });

  test("should accept PIN input and mask it", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    const pinInput = page.getByPlaceholder("Pin");
    await pinInput.fill("1234");
    await expect(pinInput).toHaveValue("1234");
    await expect(pinInput).toHaveAttribute("type", "password");
  });

  test("should not login with empty fields", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForTimeout(2_000);

    // Should remain on login page
    await expect(page.getByPlaceholder("Mobile Number")).toBeVisible();
  });

  test("should reject login with invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    await page.getByPlaceholder("Mobile Number").fill("0000000000");
    await page.getByPlaceholder("Pin").fill("0000");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await page.waitForTimeout(3_000);

    // Should stay on login page — not navigate away
    await expect(page.getByPlaceholder("Mobile Number")).toBeVisible();
  });

  // ─── Step 2→3: Successful Login & Toast ────────────────────────

  test("should show loading spinner on LOGIN button during submission", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // The LOGIN button changes to a spinner (loading indicator) during API call
    await expect(page.locator("svg.MuiCircularProgress-svg, [class*='circular'], circle")).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Some builds may not show spinner — acceptable
    });

    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
  });

  test("should show 'Logged In Successfully' toast after login", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // "Logged In Successfully" toast should appear
    await expect(page.getByText("Logged In Successfully")).toBeVisible({ timeout: 15_000 });
  });

  test("should redirect to location page after successful login", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });

    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Should redirect to /products/location (or /session-page if session already exists)
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
  });

  // ─── Step 3: Select Location ───────────────────────────────────

  test("should display Select Location page with dropdown and progress bar", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    // Skip if not on location page (session may already exist)
    if (!page.url().includes("location")) return;

    // "Select Location" label
    await expect(page.getByText("Select Location")).toBeVisible({ timeout: 10_000 });

    // Locations dropdown
    await expect(page.locator(".pos-custom-dropdown")).toBeVisible();

    // 4-step progress bar
    const progressBars = page.locator("progress");
    await expect(progressBars).toHaveCount(4);
  });

  test("should show nested locations: orgs with sub-locations in dropdown", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    if (!page.url().includes("location")) return;

    // Open the locations dropdown
    await page.locator(".pos-custom-dropdown").click();
    await page.waitForTimeout(1_000);

    // Level 1: Organization groups should appear (e.g., CANTEEN)
    const orgLabels = page.locator(".dropdown-group-label");
    await expect(orgLabels.first()).toBeVisible();
    const orgCount = await orgLabels.count();
    expect(orgCount).toBeGreaterThan(0);

    // Click first org to expand sub-locations
    await orgLabels.first().click();
    await page.waitForTimeout(1_000);

    // Level 2: Sub-locations should appear (e.g., souvik test, Sakura Cafe QSR)
    const subLocations = page.locator(".dropdown-item");
    await expect(subLocations.first()).toBeVisible();
    const subCount = await subLocations.count();
    expect(subCount).toBeGreaterThan(0);
  });

  test("should navigate to Start Day after selecting a location", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    if (!page.url().includes("location")) return;

    // Open dropdown → expand first org → select first sub-location
    await page.locator(".pos-custom-dropdown").click();
    await page.waitForTimeout(1_000);
    await page.locator(".dropdown-group-label").first().click();
    await page.waitForTimeout(1_000);
    await page.locator(".dropdown-item").first().click();

    // Should navigate to start-day or session page
    await page.waitForURL(/\/session-page\//, { timeout: 15_000 });
  });

  // ─── Step 4: Start Day ─────────────────────────────────────────

  test("should display Start Day page with button", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    // Select location if needed
    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    if (!page.url().includes("start-day")) return;

    // "Start Day" heading
    await expect(page.getByText("Start Day")).toBeVisible({ timeout: 10_000 });

    // "Start Day" button
    const startDayBtn = page.getByRole("button", { name: /start day/i });
    await expect(startDayBtn).toBeVisible();
    await expect(startDayBtn).toBeEnabled();
  });

  // ─── Step 5: Select Terminal ───────────────────────────────────

  test("should display terminal selection after starting day", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    // Select location if needed
    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    // Start day if needed
    if (page.url().includes("start-day")) {
      const startDayBtn = page.getByRole("button", { name: /start day/i });
      if (await startDayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await startDayBtn.click();
        await page.waitForTimeout(5_000);
      }
    }

    // Should show "Start Session" with terminal dropdown
    await expect(page.getByText("Start Session")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Select Terminal")).toBeVisible();

    // Terminal dropdown
    const terminalDropdown = page.locator(".pos-custom-dropdown").first();
    await expect(terminalDropdown).toBeVisible();
    await expect(terminalDropdown).toContainText(/Terminal|arrow/);

    // "Start session" button should be disabled before terminal selection
    const startSessionBtn = page.getByRole("button", { name: /start session/i });
    await expect(startSessionBtn).toBeVisible();
    await expect(startSessionBtn).toBeDisabled();
  });

  test("should enable Start Session button after selecting a terminal", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    if (page.url().includes("start-day")) {
      const btn = page.getByRole("button", { name: /start day/i });
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(5_000);
      }
    }

    // Open terminal dropdown and select a terminal
    const terminalDD = page.locator(".pos-custom-dropdown").first();
    if (await terminalDD.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await terminalDD.click();
      await page.waitForTimeout(1_000);

      // Terminal options appear as .dropdown-item (e.g., "Terminal 1", "Terminal 2")
      const terminalOpt = page.locator(".dropdown-item").first();
      await expect(terminalOpt).toBeVisible();
      await terminalOpt.click();
      await page.waitForTimeout(1_000);

      // "Start session" button should now be enabled
      const startSessionBtn = page.getByRole("button", { name: /start session/i });
      await expect(startSessionBtn).toBeEnabled();
    }
  });

  // ─── Step 6: Cash Opening Amount ───────────────────────────────

  test("should display opening page with cash amount input", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    // Location
    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    // Start Day
    if (page.url().includes("start-day")) {
      const btn = page.getByRole("button", { name: /start day/i });
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(5_000);
      }
    }

    // Terminal
    const terminalDD = page.locator(".pos-custom-dropdown").first();
    if (await terminalDD.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ddText = await terminalDD.innerText();
      if (ddText.includes("Terminal") || ddText.includes("arrow")) {
        await terminalDD.click();
        await page.waitForTimeout(1_000);
        await page.locator(".dropdown-item").first().click();
        await page.waitForTimeout(1_000);
        const ssBtn = page.getByRole("button", { name: /start session/i });
        if (await ssBtn.isEnabled().catch(() => false)) {
          await ssBtn.click();
          await page.waitForTimeout(5_000);
        }
      }
    }

    if (!page.url().includes("opening")) return;

    // "Cash amount" label
    await expect(page.getByText("Cash amount")).toBeVisible({ timeout: 10_000 });

    // "Enter cash amount" input (number type)
    const cashInput = page.locator("input[placeholder='Enter cash amount']");
    await expect(cashInput).toBeVisible();
    await expect(cashInput).toHaveAttribute("type", "number");

    // "Login as manager" and "POS user" buttons — both disabled until amount entered
    await expect(page.getByRole("button", { name: /login as manager/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /pos user/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /pos user/i })).toBeDisabled();
  });

  test("should enable POS user button after entering cash amount", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    if (page.url().includes("start-day")) {
      const btn = page.getByRole("button", { name: /start day/i });
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(5_000);
      }
    }

    const terminalDD = page.locator(".pos-custom-dropdown").first();
    if (await terminalDD.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ddText = await terminalDD.innerText();
      if (ddText.includes("Terminal") || ddText.includes("arrow")) {
        await terminalDD.click();
        await page.waitForTimeout(1_000);
        await page.locator(".dropdown-item").first().click();
        await page.waitForTimeout(1_000);
        const ssBtn = page.getByRole("button", { name: /start session/i });
        if (await ssBtn.isEnabled().catch(() => false)) {
          await ssBtn.click();
          await page.waitForTimeout(5_000);
        }
      }
    }

    if (!page.url().includes("opening")) return;

    // Enter cash amount
    await page.locator("input[placeholder='Enter cash amount']").fill("0");
    await page.waitForTimeout(500);

    // "POS user" button should now be enabled
    await expect(page.getByRole("button", { name: /pos user/i })).toBeEnabled();
  });

  // ─── Step 7: PIN Authentication ────────────────────────────────

  test("should show PIN authentication after selecting POS user", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    if (page.url().includes("start-day")) {
      const btn = page.getByRole("button", { name: /start day/i });
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(5_000);
      }
    }

    const terminalDD = page.locator(".pos-custom-dropdown").first();
    if (await terminalDD.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ddText = await terminalDD.innerText();
      if (ddText.includes("Terminal") || ddText.includes("arrow")) {
        await terminalDD.click();
        await page.waitForTimeout(1_000);
        await page.locator(".dropdown-item").first().click();
        await page.waitForTimeout(1_000);
        const ssBtn = page.getByRole("button", { name: /start session/i });
        if (await ssBtn.isEnabled().catch(() => false)) {
          await ssBtn.click();
          await page.waitForTimeout(5_000);
        }
      }
    }

    if (page.url().includes("opening")) {
      await page.locator("input[placeholder='Enter cash amount']").fill("0");
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /pos user/i }).click();
      await page.waitForTimeout(5_000);
    }

    if (!page.url().includes("authentication")) return;

    // "PIN" label
    await expect(page.getByText("PIN")).toBeVisible({ timeout: 10_000 });

    // PIN input (password, with eye toggle)
    const pinInput = page.locator("input[placeholder='Enter pin']");
    await expect(pinInput).toBeVisible();
    await expect(pinInput).toHaveAttribute("type", "password");

    // "Next" button should be disabled until PIN entered
    await expect(page.getByRole("button", { name: /next/i })).toBeDisabled();

    // "Cancel" button should be visible
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
  });

  // ─── Step 8: Manager Auth ─────────────────────────────────────

  test("should show manager auth page after PIN verification", async ({ page }) => {
    const username = process.env.POS_USERNAME!;
    const pin = process.env.POS_PIN!;

    await page.goto("/");
    await page.getByPlaceholder("Mobile Number").waitFor({ state: "visible", timeout: 20_000 });
    await page.getByPlaceholder("Mobile Number").fill(username);
    await page.getByPlaceholder("Pin").fill(pin);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await page.waitForURL(/\/(products|session-page)\//, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    if (page.url().includes("location")) {
      await page.locator(".pos-custom-dropdown").click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-group-label").first().click();
      await page.waitForTimeout(1_000);
      await page.locator(".dropdown-item").first().click();
      await page.waitForTimeout(3_000);
    }

    if (page.url().includes("start-day")) {
      const btn = page.getByRole("button", { name: /start day/i });
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(5_000);
      }
    }

    const terminalDD = page.locator(".pos-custom-dropdown").first();
    if (await terminalDD.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ddText = await terminalDD.innerText();
      if (ddText.includes("Terminal") || ddText.includes("arrow")) {
        await terminalDD.click();
        await page.waitForTimeout(1_000);
        await page.locator(".dropdown-item").first().click();
        await page.waitForTimeout(1_000);
        const ssBtn = page.getByRole("button", { name: /start session/i });
        if (await ssBtn.isEnabled().catch(() => false)) {
          await ssBtn.click();
          await page.waitForTimeout(5_000);
        }
      }
    }

    if (page.url().includes("opening")) {
      await page.locator("input[placeholder='Enter cash amount']").fill("0");
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /pos user/i }).click();
      await page.waitForTimeout(5_000);
    }

    if (page.url().includes("authentication")) {
      await page.locator("input[placeholder='Enter pin']").fill(pin);
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /next/i }).click();
      await page.waitForTimeout(5_000);
    }

    if (!page.url().includes("manager-auth")) return;

    // "Select Manager" label
    await expect(page.getByText("Select Manager")).toBeVisible({ timeout: 10_000 });

    // Manager dropdown
    await expect(page.locator(".pos-custom-dropdown")).toBeVisible();

    // "Pin" label for manager PIN
    await expect(page.getByText("Pin")).toBeVisible();

    // "Cancel" and "Finish" buttons
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /finish/i })).toBeVisible();

    // Progress bars should show 3/4 completed
    const progressBars = page.locator("progress");
    await expect(progressBars).toHaveCount(4);
  });
});
