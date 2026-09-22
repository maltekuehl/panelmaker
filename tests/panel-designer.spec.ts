import { expect, STORAGE_STATE, test } from "./test-helpers"

test.describe("Panel designer without a session", () => {
  test("invites the visitor to sign in instead of showing the workspace", async ({ page }) => {
    await page.goto("/panel")

    await expect(page.getByRole("heading", { level: 1, name: "Panel Designer" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
      "href",
      "/signin?callbackUrl=%2Fpanel",
    )
    await expect(page.getByRole("link", { name: "browse panels shared by the community" })).toBeVisible()
  })
})

test.describe("Panel designer with a session", () => {
  test.use({ storageState: STORAGE_STATE })

  test("renders the panel workspace", async ({ page }) => {
    await page.goto("/panel")

    await expect(page).toHaveTitle(/Panel Designer/)
    await expect(page.getByRole("heading", { level: 1, name: "Panel Designer" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0)

    const emptyState = page.getByText("Click on the plus icon in the upper right corner")
    const panelPicker = page.getByRole("combobox")
    await expect(emptyState.or(panelPicker.first())).toBeVisible()
  })

  test("links to the public panel listing", async ({ page }) => {
    await page.goto("/panel")

    await page.getByRole("link", { name: "Browse public panels" }).click()

    await expect(page).toHaveURL("/browse?mode=panels")
    await expect(page.getByRole("table").getByRole("columnheader", { name: "Panel" })).toBeVisible()
  })
})
