import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    // Posts results to #qa-automation when SLACK_BOT_TOKEN is present
    ...(process.env.SLACK_BOT_TOKEN
      ? [["./reporters/slack-reporter.ts"] as [string]]
      : []),
  ],
  timeout: 60_000,

  // Runs once before any browser opens — headless auth, saves session files
  globalSetup: "./tests/global.setup.ts",

  use: {
    baseURL: process.env.BASE_URL || "https://upcoming-pos.palletnow.co",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // ONE project — browser opens once, stays open for all test cases
    {
      name: "all-tests",
      testMatch: /.*\.(smoke|sanity)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "auth-state.json",
        headless: !!process.env.CI,
      },
    },
  ],
});
