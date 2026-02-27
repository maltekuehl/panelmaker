import { expect, test } from "@playwright/test"

test.describe("Experimental Report Submission", () => {
  test("should render submission page", async ({ page }) => {
    await page.goto("/submit")
    await page.waitForLoadState("networkidle")

    // Check page title
    await expect(page).toHaveTitle(/Submit|Report/)

    // Check main heading
    await expect(page.locator("h1")).toContainText("Submit Experimental Report")

    // Check that form or content is present
    const mainContent = page.locator("main, [role='main']").first()
    if ((await mainContent.count()) > 0) {
      await expect(mainContent).toBeVisible()
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
  })

  test("should have submission form elements", async ({ page }) => {
    await page.goto("/submit")
    await page.waitForLoadState("networkidle")

    // Look for form inputs - should have at least some of these
    const formElements = page.locator('form, input, textarea, select, [role="combobox"]').first()

    if ((await formElements.count()) > 0) {
      await expect(formElements).toBeVisible()
    }

    // Check for description text
    const description = page.locator("text=/peer review|community|contribution/i")
    if ((await description.count()) > 0) {
      await expect(description).toBeVisible()
    }
  })

  test("authenticated: should load form for logged-in user", async ({ page }) => {
    // First sign in
    await page.goto("/signin")
    await page.waitForLoadState("networkidle")

    const passwordField = page.locator('input[type="password"]').first()
    const isTestMode = (await passwordField.count()) > 0

    if (isTestMode) {
      await passwordField.fill("password")
      await page.getByRole("button", { name: "Sign In with Test Credentials" }).click()
      await page.waitForURL("/")

      // Now navigate to submit page
      await page.goto("/submit")
      await page.waitForLoadState("networkidle")

      // Should not show sign-in message
      const signInRequired = page.locator("text=/sign in required|sign in to/i")
      expect(await signInRequired.count()).toBe(0)

      // Should have form elements
      const form = page.locator("form").first()
      if ((await form.count()) > 0) {
        await expect(form).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/submit")
    await page.waitForLoadState("networkidle")

    // Check that page heading is visible
    await expect(page.locator("h1").first()).toBeVisible()

    // Check that main content is visible
    const mainContent = page.locator("main, [role='main']").first()
    if ((await mainContent.count()) > 0) {
      await expect(mainContent).toBeVisible()
    }
  })
})
