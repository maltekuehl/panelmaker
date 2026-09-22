import { expect, test } from "./test-helpers"

test.describe("Blog", () => {
  test("renders the blog index with a search field and a post list", async ({ page }) => {
    await page.goto("/blog")

    await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeVisible()
    await expect(page.getByPlaceholder("Search blog posts...")).toBeVisible()

    const posts = page.locator("article")
    const emptyState = page.getByText("No blog posts available yet.")
    await expect(posts.first().or(emptyState)).toBeVisible()
  })

  test("typing in the search field puts the term in the URL", async ({ page }) => {
    await page.goto("/blog")

    await page.getByPlaceholder("Search blog posts...").fill("panelmaker")

    await page.waitForURL(/[?&]search=panelmaker/)
    await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeVisible()
  })

  test("a search with no matches shows the empty state", async ({ page }) => {
    await page.goto("/blog?search=qqzzxxnomatch")

    await expect(page.getByText("No blog posts found matching your search.")).toBeVisible()
    await expect(page.getByRole("link", { name: "view all posts" })).toBeVisible()
  })
})
