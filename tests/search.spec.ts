import { expect, test } from "./test-helpers"

test.describe("Search", () => {
  test("the header search sends the query to the browse page", async ({ page }) => {
    await page.goto("/")

    const search = page.getByRole("banner").getByRole("searchbox")
    await expect(search).toBeVisible()

    await search.fill("CD4")
    await search.press("Enter")

    await expect(page).toHaveURL("/browse?q=CD4")
    await expect(page.getByText('Showing antibodies results for "CD4"')).toBeVisible()
  })

  test("a query in the URL is applied to the browse table", async ({ page }) => {
    await page.goto("/browse?q=CD8")

    await expect(page.getByText('Showing antibodies results for "CD8"')).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()
  })

  test("the browse toolbar search updates the URL", async ({ page }) => {
    await page.goto("/browse")

    await page.getByRole("searchbox", { name: "tissues" }).fill("FOXP3")

    await page.waitForURL(/[?&]q=FOXP3/)
    await expect(page.getByText('Showing antibodies results for "FOXP3"')).toBeVisible()
  })

  test("an empty query shows the default browse description", async ({ page }) => {
    await page.goto("/browse?q=")

    await expect(page.getByText("Explore markers, antibodies, and experimental reports")).toBeVisible()
  })
})
