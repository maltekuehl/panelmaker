import { expect, test } from "./test-helpers"

test.describe("Documentation", () => {
  test("renders the introduction page with its navigation", async ({ page }) => {
    await page.goto("/docs")

    await expect(page.getByRole("heading", { level: 1, name: "PanelMaker Introduction" })).toBeVisible()

    const docsNav = page.locator("aside")
    await expect(docsNav.getByRole("link", { name: "Start" })).toBeVisible()
    await expect(docsNav.getByRole("link", { name: "Public API" })).toBeVisible()
    await expect(docsNav.getByRole("link", { name: "Code of Conduct" })).toBeVisible()
  })

  test("a navigation entry opens the matching page", async ({ page }) => {
    await page.goto("/docs")

    await page.locator("aside").getByRole("link", { name: "Browse Markers" }).click()

    await expect(page).toHaveURL("/docs/getting-started/browse")
    await expect(page.getByRole("heading", { level: 1, name: "Browse Markers" })).toBeVisible()
  })

  test("renders the public API reference", async ({ page }) => {
    await page.goto("/docs/api")

    await expect(page.getByRole("heading", { level: 1, name: "Public API" })).toBeVisible()
  })

  test("renders the about page", async ({ page }) => {
    await page.goto("/docs/about")

    await expect(page.getByRole("heading", { level: 1, name: "About PanelMaker" })).toBeVisible()
  })
})
