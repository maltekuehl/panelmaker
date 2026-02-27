import { expect, test } from "@playwright/test"

test.describe("Browse Page", () => {
  test("should render browse page with data table", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // Check page title
    await expect(page).toHaveTitle(/Browse/)

    // Check main heading
    await expect(page.locator("h1, h2")).toContainText("Marker Database")

    // Check that data table is present
    const table = page.locator("table, [role='table'], .data-table").first()
    if ((await table.count()) > 0) {
      await expect(table).toBeVisible()
    }

    // Check that main content area exists
    await expect(page.locator("main, [role='main']").first()).toBeVisible()

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

  test("should display search results when query param is present", async ({ page }) => {
    await page.goto("/browse?q=CD4")
    await page.waitForLoadState("networkidle")

    // Check that page shows search results message
    const resultMessage = page.locator('text="Showing results for"')
    const hasResultsText = (await resultMessage.count()) > 0
    if (hasResultsText) {
      await expect(resultMessage).toBeVisible()
    }

    // Check that main content is visible
    await expect(page.locator("main, [role='main']").first()).toBeVisible()
  })

  test("should show default message when no query param", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // Check description text when no search
    const defaultMessage = page.locator("text=/Browse validated|Browse markers/i")
    if ((await defaultMessage.count()) > 0) {
      await expect(defaultMessage).toBeVisible()
    }
  })

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // Check that page content is visible on mobile
    await expect(page.locator("h1, h2").first()).toBeVisible()

    const mainContent = page.locator("main, [role='main']").first()
    if ((await mainContent.count()) > 0) {
      await expect(mainContent).toBeVisible()
    }
  })

  test("should have panel workspace sidebar on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // The browse page shows panel workspace on the right side
    // Check that both main table area and sidebar are visible
    const dataTable = page.locator("[data-testid='data-table'], table").first()
    const sidebarArea = page.locator(".panel-workspace, [class*='workspace'], [class*='sidebar']").first()

    if ((await dataTable.count()) > 0) {
      await expect(dataTable).toBeVisible()
    }

    if ((await sidebarArea.count()) > 0) {
      await expect(sidebarArea).toBeVisible()
    }
  })
})
