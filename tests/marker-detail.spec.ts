import { expect, SEEDED, test } from "./test-helpers"

test.describe("Marker detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/marker/${SEEDED.PROTEIN_ID}`)
  })

  test("shows the protein header with its UniProt accession", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(`UniProt: ${SEEDED.PROTEIN_ID}`)).toBeVisible()
    await expect(page.getByText("Gene Symbol:")).toBeVisible()
  })

  test("shows the report, cell type and external resource sections", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 2, name: "Experimental Reports" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Associated Cell Types" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "External Resources" })).toBeVisible()

    await expect(page.getByRole("link", { name: `View in UniProt (${SEEDED.PROTEIN_ID})` })).toHaveAttribute(
      "href",
      `https://www.uniprot.org/uniprotkb/${SEEDED.PROTEIN_ID}/entry`,
    )
  })

  test("breadcrumbs link back to browse", async ({ page }) => {
    await page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: "Markers" }).click()

    await expect(page).toHaveURL("/browse")
  })
})

test.describe("Cell type detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/celltype/${SEEDED.CELL_TYPE_ID}`)
  })

  test("shows the cell type header with its ontology id", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText(SEEDED.CELL_TYPE_ID)
  })

  test("shows the related markers and external resource sections", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 2, name: "Related Markers" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "External Resources" })).toBeVisible()

    await expect(page.getByRole("link", { name: "View in Cell Ontology (OLS)" })).toHaveAttribute("href", /ebi\.ac\.uk/)
  })

  test("an unknown cell type id renders the not found page", async ({ page }) => {
    await page.goto("/celltype/CL:9999999")

    await expect(page.getByText("Cell Type Not Found")).toBeVisible()
    await expect(page.getByRole("link", { name: "Browse All Markers" })).toBeVisible()
  })
})
