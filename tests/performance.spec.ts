import { expect, test } from "./test-helpers"

test.describe("Performance and accessibility basics", () => {
  test("the document reaches DOMContentLoaded well inside the budget", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("load")

    const timeToDomContentLoaded = await page.evaluate(() => {
      const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
      return navigation.domContentLoadedEventEnd - navigation.startTime
    })

    expect(timeToDomContentLoaded).toBeGreaterThan(0)
    expect(timeToDomContentLoaded).toBeLessThan(15000)
  })

  test("the page exposes landmarks and a single top-level heading", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("banner")).toBeVisible()
    await expect(page.locator("main").first()).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
  })

  test("keyboard focus reaches an interactive element", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    await page.keyboard.press("Tab")

    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "")
    expect(["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"]).toContain(focused)
  })

  test("reduced motion does not break the page", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" })
    const page = await context.newPage()

    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    await context.close()
  })

  test("the document exposes the expected meta tags", async ({ page }) => {
    await page.goto("/")

    expect(await page.title()).toContain("PanelMaker")
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/)
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/)
  })
})
