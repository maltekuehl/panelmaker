import { expect, test } from "./test-helpers"

test.describe("Home Page", () => {
  test("shows the hero, the database stats and the destination cards", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveTitle(/PanelMaker/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("spatial proteomics")

    await expect(page.getByText("Proteins", { exact: true })).toBeVisible()
    await expect(page.getByText("Antibodies", { exact: true })).toBeVisible()
    await expect(page.getByText("Validated Reports", { exact: true })).toBeVisible()

    const destinations = page.locator("section").last()
    for (const title of ["Browse Antibodies", "Design a Panel", "Submit a Report", "Documentation"]) {
      await expect(destinations.getByRole("link", { name: title })).toBeVisible()
    }
  })

  test("the Browse Antibodies card navigates to the browse page", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("link", { name: "Browse Antibodies" }).click()

    await expect(page).toHaveURL("/browse")
    await expect(page.getByRole("heading", { level: 1, name: "Browse" })).toBeVisible()
  })

  test("the sidebar logo returns to the home page", async ({ page }) => {
    await page.goto("/browse")

    await page.getByRole("link", { name: "PanelMaker" }).click()

    await expect(page).toHaveURL("/")
  })
})
