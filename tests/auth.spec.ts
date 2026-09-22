import { expect, LOGGED_OUT, test, TEST_USER } from "./test-helpers"

test.use({ storageState: LOGGED_OUT })

test.describe("Sign-in page", () => {
  test("renders the credentials form", async ({ page }) => {
    await page.goto("/signin")

    await expect(page).toHaveTitle(/Sign In/)
    await expect(page.getByText("Sign in to your account")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/signup")
  })

  test("rejects a wrong password", async ({ page }) => {
    await page.goto("/signin")

    await page.getByLabel("Email").fill(TEST_USER.email)
    await page.getByLabel("Password").fill("definitely-not-the-password")
    await page.getByRole("button", { name: "Sign in", exact: true }).click()

    await expect(page.getByText("Invalid email or password.")).toBeVisible()
  })

  test("signs the demo user in and shows their account in the header", async ({ page }) => {
    await page.goto("/signin")

    await page.getByLabel("Email").fill(TEST_USER.email)
    await page.getByLabel("Password").fill(TEST_USER.password)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()

    await page.waitForURL("/")
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign In" })).toHaveCount(0)

    await page.getByRole("banner").locator('button[aria-haspopup="menu"]').last().click()

    await expect(page.getByText(TEST_USER.email)).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible()
  })
})

test.describe("Protected areas without a session", () => {
  test("the chat asks for a sign-in", async ({ page }) => {
    await page.goto("/chat")

    await expect(page.getByText("Sign in required")).toBeVisible()
  })

  test("the submit page redirects to sign-in with a callback", async ({ page }) => {
    await page.goto("/submit")

    await expect(page).toHaveURL("/signin?callbackUrl=%2Fsubmit")
  })

  test("the header offers a sign-in entry point", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("banner").getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/signin")
  })
})
