import { expect, STORAGE_STATE, test } from "./test-helpers"

test.describe("Report submission without a session", () => {
  test("redirects to the sign-in page", async ({ page }) => {
    await page.goto("/submit")

    await expect(page).toHaveURL("/signin?callbackUrl=%2Fsubmit")
    await expect(page.getByText("Sign in to your account")).toBeVisible()
  })
})

test.describe("Report submission with a session", () => {
  test.use({ storageState: STORAGE_STATE })

  test("renders the stepped submission form", async ({ page }) => {
    await page.goto("/submit")

    await expect(page).toHaveTitle(/Submit Experimental Report/)
    await expect(page.getByRole("heading", { level: 1, name: "Submit Experimental Report" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Experiment details" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Antibodies" })).toBeVisible()
  })

  test("breadcrumbs point back to the home page", async ({ page }) => {
    await page.goto("/submit")

    await page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: "Home" }).click()

    await expect(page).toHaveURL("/")
  })
})
