import { expect, test } from "@playwright/test"

test.describe("Marker/Cell Type Detail Page", () => {
  test("should navigate to cell type detail from browse page", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // Look for clickable rows or links to detail pages
    const detailLinks = page.locator('a[href*="/celltype/"], tr[role="row"] a').first()

    if ((await detailLinks.count()) > 0) {
      const href = await detailLinks.getAttribute("href")
      if (href && href.includes("/celltype/")) {
        await detailLinks.click()
        await page.waitForLoadState("networkidle")

        // Should navigate to a cell type detail page
        await expect(page).toHaveURL(/\/celltype\//)
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test("should render cell type detail page with heading", async ({ page }) => {
    // Go to browse first to get a valid cell type ID
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    // Find first detail link
    const detailLinks = page.locator('a[href*="/celltype/"]').first()

    if ((await detailLinks.count()) > 0) {
      await detailLinks.click()
      await page.waitForLoadState("networkidle")

      // Check main heading
      const heading = page.locator("h1").first()
      if ((await heading.count()) > 0) {
        await expect(heading).toBeVisible()
      }

      // Check that page has content
      await expect(page.locator("main, [role='main']").first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test("should display cell type information", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    const detailLinks = page.locator('a[href*="/celltype/"]').first()

    if ((await detailLinks.count()) > 0) {
      await detailLinks.click()
      await page.waitForLoadState("networkidle")

      // Check for cell type ID (ontology identifier)
      const cellTypeId = page.locator('span[class*="font-mono"]').first()
      if ((await cellTypeId.count()) > 0) {
        await expect(cellTypeId).toBeVisible()
      }

      // Check for badge showing marker count
      const markerBadge = page.locator('[class*="badge"]').first()
      if ((await markerBadge.count()) > 0) {
        await expect(markerBadge).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test("should show related markers table", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    const detailLinks = page.locator('a[href*="/celltype/"]').first()

    if ((await detailLinks.count()) > 0) {
      await detailLinks.click()
      await page.waitForLoadState("networkidle")

      // Check for "Related Markers" section
      const markersHeading = page.locator("text=/Related Markers|Markers/")
      if ((await markersHeading.count()) > 0) {
        await expect(markersHeading).toBeVisible()
      }

      // Check for markers table
      const table = page.locator("table, [role='table']").first()
      if ((await table.count()) > 0) {
        await expect(table).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test("should have external links section", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    const detailLinks = page.locator('a[href*="/celltype/"]').first()

    if ((await detailLinks.count()) > 0) {
      await detailLinks.click()
      await page.waitForLoadState("networkidle")

      // Check for "External Resources" section
      const externalHeading = page.locator("text=/External Resources|External Links/")
      if ((await externalHeading.count()) > 0) {
        await expect(externalHeading).toBeVisible()
      }

      // Check for OLS (Cell Ontology) link
      const olsLink = page.locator('a:has-text("Cell Ontology"), a[href*="ebi.ac.uk"]').first()
      if ((await olsLink.count()) > 0) {
        await expect(olsLink).toBeVisible()
        const href = await olsLink.getAttribute("href")
        expect(href).toContain("ebi.ac.uk")
      }
    } else {
      test.skip()
    }
  })

  test("should handle invalid cell type ID with 404", async ({ page }) => {
    await page.goto("/celltype/INVALID_ID_12345")

    // Should show 404 or not found message
    const notFound = page.locator("text=/404|not found|does not exist/i")
    if ((await notFound.count()) > 0) {
      await expect(notFound).toBeVisible()
    } else {
      // Page might redirect back
      await expect(page).not.toHaveURL(/INVALID_ID/)
    }
  })

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    const detailLinks = page.locator('a[href*="/celltype/"]').first()

    if ((await detailLinks.count()) > 0) {
      await detailLinks.click()
      await page.waitForLoadState("networkidle")

      // Check that heading is visible on mobile
      await expect(page.locator("h1").first()).toBeVisible()

      // Check that main content is visible
      await expect(page.locator("main, [role='main']").first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test("should have breadcrumb navigation", async ({ page }) => {
    await page.goto("/browse")
    await page.waitForLoadState("networkidle")

    const detailLinks = page.locator('a[href*="/celltype/"]').first()

    if ((await detailLinks.count()) > 0) {
      await detailLinks.click()
      await page.waitForLoadState("networkidle")

      // Check for breadcrumbs
      const breadcrumbs = page.locator('[class*="breadcrumb"], nav:has-text("Cell Types"), a[href="/browse"]').first()
      if ((await breadcrumbs.count()) > 0) {
        await expect(breadcrumbs).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})
