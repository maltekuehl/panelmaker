import { expect, test as setup } from "@playwright/test"
import { STORAGE_STATE, TEST_USER } from "./test-helpers"

setup("sign in with the demo credentials", async ({ page }) => {
  await page.goto("/signin")

  await page.getByLabel("Email").fill(TEST_USER.email)
  await page.getByLabel("Password").fill(TEST_USER.password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()

  await page.waitForURL("/")

  await page.goto("/submit")
  await expect(page.getByRole("heading", { level: 1, name: "Submit Experimental Report" })).toBeVisible()

  await page.context().storageState({ path: STORAGE_STATE })
})
