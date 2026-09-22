import { expect, STORAGE_STATE, test } from "./test-helpers"

const COMPOSER_PLACEHOLDER = "E.g., which markers work for resident memory T cells in human kidney?"

test.describe("Chat without a session", () => {
  test("asks the visitor to sign in", async ({ page }) => {
    await page.goto("/chat")

    await expect(page.getByText("Sign in required")).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in to continue" })).toHaveAttribute(
      "href",
      "/signin?callbackUrl=/chat",
    )
    await expect(page.getByPlaceholder(COMPOSER_PLACEHOLDER)).toHaveCount(0)
  })
})

test.describe("Chat with a session", () => {
  test.use({ storageState: STORAGE_STATE })

  test("opens a conversation with a usable composer", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForURL(/\/chat\/.+/)

    const composer = page.getByPlaceholder(COMPOSER_PLACEHOLDER)
    await expect(composer).toBeVisible()

    const send = page.getByRole("button", { name: "Send message" })
    await expect(send).toBeDisabled()

    await composer.fill("Which markers label T cells?")
    await expect(send).toBeEnabled()
  })

  test("offers a model picker when more than one model is configured", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForURL(/\/chat\/.+/)

    await expect(page.getByPlaceholder(COMPOSER_PLACEHOLDER)).toBeVisible()

    const modelPicker = page.getByRole("combobox")
    if ((await modelPicker.count()) === 0) {
      test.skip(true, "Only one AI provider is configured in this environment")
    }

    await expect(modelPicker.first()).toBeVisible()
  })
})
