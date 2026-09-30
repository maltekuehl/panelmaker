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

  test("offers a model picker grouped by provider with the key source", async ({ page }) => {
    await page.goto("/chat")
    await page.waitForURL(/\/chat\/.+/)

    await expect(page.getByPlaceholder(COMPOSER_PLACEHOLDER)).toBeVisible()
    await expect(page.getByText("Using the instance key")).toBeVisible()

    await page.getByRole("button", { name: "Choose model" }).click()
    await expect(page.getByRole("menu").getByText("Google Gemini")).toBeVisible()
    await expect(page.getByRole("menuitemradio", { name: /Gemini 3\.5 Flash Lite/ })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Manage API keys" })).toHaveAttribute("href", "/settings#ai-keys")
  })
})

test.describe("AI key settings", () => {
  test.use({ storageState: STORAGE_STATE })

  test("lists every provider with an add action", async ({ page }) => {
    await page.goto("/settings#ai-keys")

    const section = page.locator("#ai-keys")
    await expect(section.getByRole("heading", { name: "AI provider keys" })).toBeVisible()
    for (const provider of ["Google Gemini", "OpenAI", "Anthropic"]) {
      await expect(section.getByText(provider, { exact: true })).toBeVisible()
    }
    await expect(section.getByText("Not set. The assistant uses the instance key.")).toBeVisible()

    await section.getByRole("button", { name: "Add key" }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: /Add .* key/ })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Save key" })).toBeDisabled()
  })
})
