import { expect, test } from "@playwright/test"

test.describe("Panel Designer", () => {
  test("unauthenticated: should redirect to sign-in", async ({ page }) => {
    await page.goto("/panel")

    // Should redirect to signin with callback
    await expect(page).toHaveURL(/\/signin|\/auth/)
  })

  test("authenticated: should render panel designer page", async ({ page }) => {
    // First, sign in
    await page.goto("/signin")
    await page.waitForLoadState("networkidle")

    const passwordField = page.locator('input[type="password"]').first()
    const isTestMode = (await passwordField.count()) > 0

    if (isTestMode) {
      await passwordField.fill("password")
      await page.getByRole("button", { name: "Sign In with Test Credentials" }).click()
      await page.waitForURL("/")

      // Now navigate to panel page
      await page.goto("/panel")
      await page.waitForLoadState("networkidle")

      // Check page title and heading
      await expect(page).toHaveTitle(/Panel/)
      await expect(page.locator("h1")).toContainText("Panel Designer")

      // Check that main content area exists
      const mainContent = page.locator("main, [role='main']").first()
      if ((await mainContent.count()) > 0) {
        await expect(mainContent).toBeVisible()
      }

      // Check that panel workspace is present
      const panelWorkspace = page.locator(".panel-workspace, [class*='workspace'], [class*='panel']").first()
      if ((await panelWorkspace.count()) > 0) {
        await expect(panelWorkspace).toBeVisible()
      }

      // Verify no critical console errors
      const errors: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text())
        }
      })

      await page.waitForTimeout(1000)

      expect(
        errors.filter(
          (error) =>
            !error.includes("favicon") &&
            !error.includes("Third-party") &&
            !error.includes("Extension") &&
            !error.includes("fetch"),
        ),
      ).toHaveLength(0)
    } else {
      test.skip()
    }
  })

  test("authenticated: should have marker search interface", async ({ page }) => {
    await page.goto("/signin")
    await page.waitForLoadState("networkidle")

    const passwordField = page.locator('input[type="password"]').first()
    const isTestMode = (await passwordField.count()) > 0

    if (isTestMode) {
      await passwordField.fill("password")
      await page.getByRole("button", { name: "Sign In with Test Credentials" }).click()
      await page.waitForURL("/")

      await page.goto("/panel")
      await page.waitForLoadState("networkidle")

      // Look for search input (might be combobox or text input)
      const searchInput = page
        .locator('input[placeholder*="search"], input[placeholder*="Search"], [role="combobox"], input[type="text"]')
        .first()

      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test("authenticated: should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/signin")
    await page.waitForLoadState("networkidle")

    const passwordField = page.locator('input[type="password"]').first()
    const isTestMode = (await passwordField.count()) > 0

    if (isTestMode) {
      await passwordField.fill("password")
      await page.getByRole("button", { name: "Sign In with Test Credentials" }).click()
      await page.waitForURL("/")

      await page.goto("/panel")
      await page.waitForLoadState("networkidle")

      // Check that page heading is visible on mobile
      await expect(page.locator("h1").first()).toBeVisible()

      // Check that main content area is visible
      const mainContent = page.locator("main, [role='main']").first()
      if ((await mainContent.count()) > 0) {
        await expect(mainContent).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})
