import { expect, test } from "./test-helpers"

test.describe("Error handling and edge cases", () => {
  test("an unknown route renders the custom 404 page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist")

    await expect(page.getByText("Page Not Found")).toBeVisible()
    await expect(page.getByRole("link", { name: "Go to Homepage" })).toHaveAttribute("href", "/")
    await expect(page.getByRole("link", { name: "Browse Markers" })).toHaveAttribute("href", "/browse")
  })

  test("the 404 page navigates to browse", async ({ page }) => {
    await page.goto("/another-page-that-does-not-exist")

    await page.getByRole("link", { name: "Browse Markers" }).click()

    await expect(page).toHaveURL("/browse")
    await expect(page.getByRole("heading", { level: 1, name: "Browse" })).toBeVisible()
  })

  test("an unknown marker id renders the marker not found page", async ({ page }) => {
    await page.goto("/marker/NOT_A_REAL_ACCESSION")

    await expect(page.getByText("Marker Not Found")).toBeVisible()
  })

  test.describe("with the API blocked", () => {
    test.use({ allowConsoleErrors: true })

    test("the shell still renders when API calls fail", async ({ page, context }) => {
      await context.route("**/api/**", (route) => route.abort())

      await page.goto("/")

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(page.getByRole("banner")).toBeVisible()
    })
  })

  test("the page renders without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    await context.close()
  })
})
