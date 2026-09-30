import { expect, test } from "./test-helpers"

const SIDEBAR = '[data-slot="sidebar"]'

test.describe("Navigation and Layout", () => {
  test("the sidebar links to the main sections", async ({ page }) => {
    await page.goto("/")

    const sidebar = page.locator(SIDEBAR)
    for (const item of ["Browse", "Panel Designer", "AI Assistant", "Labs", "Documentation", "Community"]) {
      await expect(sidebar.getByRole("link", { name: item, exact: true })).toBeVisible()
    }
  })

  test("a sidebar link navigates and keeps the app shell", async ({ page }) => {
    await page.goto("/")

    await page.locator(SIDEBAR).getByRole("link", { name: "Panel Designer", exact: true }).click()

    await expect(page).toHaveURL("/panel")
    await expect(page.getByRole("heading", { level: 1, name: "Panel Designer" })).toBeVisible()
    await expect(page.getByRole("banner")).toBeVisible()
  })

  test("the header trigger collapses the sidebar", async ({ page }) => {
    await page.goto("/")

    const sidebar = page.locator(SIDEBAR)
    await expect(sidebar).toHaveAttribute("data-state", "expanded")

    await page.getByRole("button", { name: "Toggle Sidebar" }).click()

    await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  })

  test("the theme can be switched to dark", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Dark" }).click()

    await expect(page.locator("html")).toHaveClass(/dark/)
  })

  test("the header offers the submit shortcut", async ({ page }) => {
    await page.goto("/browse")

    await expect(page.getByRole("banner").getByRole("link", { name: "Submit" })).toHaveAttribute("href", "/submit")
  })
})
