import { expect, test, TEST_DATA } from "./test-helpers"

test.describe("Legal Pages", () => {
  for (const { path, name, heading } of TEST_DATA.LEGAL_PAGES) {
    test(`renders the ${name} page`, async ({ page }) => {
      await page.goto(path)

      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
      await expect(page.locator("main p").first()).toBeVisible()
    })
  }

  test("the sidebar footer links to every legal page", async ({ page }) => {
    await page.goto("/")

    const sidebar = page.locator('[data-slot="sidebar"]')
    await expect(sidebar.getByRole("link", { name: "Legal Notice" })).toHaveAttribute("href", "/legal/notice")
    await expect(sidebar.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms")
    await expect(sidebar.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/legal/privacy")
  })
})
