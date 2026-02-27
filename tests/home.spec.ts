import { expect, test } from "@playwright/test"

test.describe("Home Page", () => {
  test("should render homepage correctly", async ({ page }) => {
    await page.goto("/")

    // Check page title
    await expect(page).toHaveTitle(/PanelMaker/)

    // Check main heading
    await expect(page.locator("h1")).toContainText("PanelMaker")

    // Check that main navigation elements are present
    await expect(page.locator("nav, #mobile-nav").first()).toBeVisible()

    // Check that main content area exists
    await expect(page.locator("main, [role='main'], .container").first()).toBeVisible()

    // Verify no console errors (common rendering issues)
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text())
      }
    })

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle")

    // Check that there are no critical console errors
    expect(
      errors.filter(
        (error) => !error.includes("favicon") && !error.includes("Third-party") && !error.includes("Extension"),
      ),
    ).toHaveLength(0)
  })

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/")

    // Check that mobile navigation works
    await expect(page.locator("h1")).toBeVisible()
    await expect(page.locator("h1")).toHaveText("PanelMaker")

    // Check that main content is visible on mobile
    const mainContent = page.locator("main, [role='main']").first()
    if ((await mainContent.count()) > 0) {
      await expect(mainContent).toBeVisible()
    }
  })

  test("should have working logo/home link", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const logoLink = page.locator('header a[href="/"], header a:has-text("PanelMaker")').first()

    if ((await logoLink.count()) > 0) {
      // Navigate to another page first
      await page.goto("/browse")
      // Then click logo to go back home
      await page.locator('header a[href="/"], header a:has-text("PanelMaker")').first().click()
      await expect(page).toHaveURL("/")
    }
  })
})
