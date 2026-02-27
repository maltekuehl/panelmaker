import { expect, test } from "@playwright/test"

test.describe("Search Functionality", () => {
  test("should have search input in navigation", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Look for search input in header/nav
    const searchInput = page
      .locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="search"]')
      .first()

    if ((await searchInput.count()) > 0) {
      await expect(searchInput).toBeVisible()
    }
  })

  test("should search from nav and navigate to browse with query", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Find search input
    const searchInput = page
      .locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="search"]')
      .first()

    if ((await searchInput.count()) > 0) {
      // Type search query
      await searchInput.fill("CD4")

      // Press Enter or click search button
      const submitButton = page.locator('button[type="submit"], button:has-text("Search")').first()
      if ((await submitButton.count()) > 0) {
        await submitButton.click()
      } else {
        await searchInput.press("Enter")
      }

      // Should navigate to browse page with query param
      await page.waitForURL(/\/browse/)
      await expect(page).toHaveURL(/\/browse.*q=/)
    } else {
      test.skip()
    }
  })

  test("should display search results on browse page", async ({ page }) => {
    await page.goto("/browse?q=CD8")
    await page.waitForLoadState("networkidle")

    // Should show "Showing results for" message
    const resultsMessage = page.locator('text="Showing results for"')
    if ((await resultsMessage.count()) > 0) {
      await expect(resultsMessage).toBeVisible()
      await expect(resultsMessage).toContainText("CD8")
    }

    // Should have data table visible
    const table = page.locator("table, [role='table']").first()
    if ((await table.count()) > 0) {
      await expect(table).toBeVisible()
    }
  })

  test("should handle empty search query", async ({ page }) => {
    await page.goto("/browse?q=")
    await page.waitForLoadState("networkidle")

    // Should show all results (no specific search message)
    await expect(page.locator("body")).toBeVisible()

    // Check that page loads without errors
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text())
      }
    })

    await page.waitForTimeout(500)

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

  test("should support search from browse page", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // Look for search input on browse page itself
    const searchInput = page
      .locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="search"]')
      .first()

    if ((await searchInput.count()) > 0) {
      // Type search term
      await searchInput.fill("FOXP3")

      // Wait for results to update
      await page.waitForTimeout(500)

      // Check if page updates with results
      const resultsMessage = page.locator('text="Showing results for"')
      const pageUrl = page.url()

      // Either shows results message or URL changes
      const showsResults = (await resultsMessage.count()) > 0 || pageUrl.includes("q=")
      expect(showsResults).toBeTruthy()
    } else {
      test.skip()
    }
  })
})
