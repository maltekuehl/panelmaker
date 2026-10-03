import { expect, test } from "./test-helpers"

test.describe("Browse Page", () => {
  test("renders the marker table", async ({ page }) => {
    await page.goto("/browse")

    await expect(page).toHaveTitle(/Browse/)
    await expect(page.getByRole("heading", { level: 1, name: "Browse" })).toBeVisible()
    await expect(page.getByText("Explore markers, antibodies, and experimental reports")).toBeVisible()

    const table = page.getByRole("table")
    await expect(table).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Marker" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Cell Types" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Species" })).toBeVisible()
  })

  test("marker rows link to marker detail pages", async ({ page }) => {
    await page.goto("/browse")

    await expect(page.getByRole("table").locator('a[href^="/marker/"]').first()).toBeVisible()
  })

  test("a query parameter is reflected in the page description", async ({ page }) => {
    await page.goto("/browse?q=CD4")

    await expect(page.getByText('Showing markers results for "CD4"')).toBeVisible()
  })

  test("the antibodies mode renders the antibody table", async ({ page }) => {
    await page.goto("/browse?mode=antibodies")

    const table = page.getByRole("table")
    await expect(table.getByRole("columnheader", { name: "Antibody" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "RRID" })).toBeVisible()
  })

  test("secondary columns are hidden until enabled", async ({ page }) => {
    await page.goto("/browse?mode=antibodies")

    const table = page.getByRole("table")
    await expect(table.getByRole("button", { name: "RRID" })).toBeVisible()
    await expect(table.getByRole("button", { name: "Clone", exact: true })).toHaveCount(0)

    await page.getByRole("button", { name: "Show more columns" }).click()
    await page.getByRole("menuitemcheckbox", { name: "Clone" }).click()
    await page.keyboard.press("Escape")

    await expect(table.getByRole("button", { name: "Clone", exact: true })).toBeVisible()
  })

  test("the page does not scroll sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto("/browse")

    await expect(page.getByRole("group", { name: "Browse mode" })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
