import { expect, test, TEST_DATA } from "./test-helpers"

test.describe("Page smoke checks", () => {
  for (const { path, name, heading } of TEST_DATA.COMMON_PAGES) {
    test(`renders the ${name} page`, async ({ page }) => {
      await page.goto(path)

      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
      await expect(page.getByRole("banner")).toBeVisible()
      await expect(page.locator("main").first()).toBeVisible()
    })
  }
})
