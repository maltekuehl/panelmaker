import { defineConfig, devices } from "@playwright/test"

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["unit/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run build:test && npm run start:test",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 15 * 60 * 1000,
    env: {
      NEXT_PUBLIC_TEST_MODE: "true",
      NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
    },
  },
})
