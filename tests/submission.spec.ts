import sharp from "sharp"
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

    const stepper = page.getByRole("navigation", { name: "Submission steps" })
    await expect(stepper.getByRole("button", { name: /Experiment/ })).toHaveAttribute("aria-current", "step")
    await stepper.getByRole("button", { name: /Antibodies/ }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Antibodies" })).toBeVisible()
  })

  test("validate keeps the user on the step until the required field is filled", async ({ page }) => {
    await page.goto("/submit")

    await page.getByRole("button", { name: "Validate & next" }).click()
    await expect(page.getByText("Give the experiment a name so the reports can be grouped.")).toBeVisible()

    await page.getByRole("textbox", { name: "Experiment name" }).fill("Tonsil run")
    await page.getByRole("button", { name: "Next: Sample & method" }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Sample and method" })).toBeVisible()
  })

  test("steps can be skipped and submit enforces them", async ({ page }) => {
    await page.goto("/submit")

    await page.getByRole("button", { name: "Skip for now" }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Sample and method" })).toBeVisible()

    await page.getByRole("button", { name: "Next: Antibodies" }).click()
    await page.getByRole("button", { name: /Submit 1 report/ }).click()

    await expect(page.getByText("Add an experiment name before submitting.")).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Experiment name" })).toBeVisible()
  })

  test("imaging method search offers EFO terms and local methods filed under them", async ({ page }) => {
    await page.goto("/submit")
    await page.getByRole("button", { name: "Skip for now" }).click()

    await page.getByRole("combobox", { name: "Imaging method" }).click()
    const search = page.getByPlaceholder("Search EFO imaging methods…").last()

    await search.fill("mass")
    await expect(page.getByRole("option", { name: /EFO:0022997/ })).toBeVisible()

    await search.fill("patho")
    await page.getByRole("option", { name: /PathoPlex/ }).click()
    await expect(page.getByRole("combobox", { name: "Imaging method" })).toHaveText(/PathoPlex/)
  })

  test("a field of view is shared between antibodies with its own colours and counterstains", async ({ page }) => {
    const png = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#204060" } })
      .png()
      .toBuffer()
    let payload: { antibodies: { markerName: string; images: Record<string, unknown>[] }[] } | undefined
    await page.route("**/api/reports/batch", async (route) => {
      payload = route.request().postDataJSON()
      await route.fulfill({ status: 201, json: { createdCount: 2, created: [{ experimentId: "x" }], failed: [] } })
    })

    await page.goto("/submit")
    await page.getByRole("textbox", { name: "Experiment name" }).fill("FOV run")
    await page
      .getByRole("navigation", { name: "Submission steps" })
      .getByRole("button", { name: /Antibodies/ })
      .click()

    await page.getByRole("button", { name: "Add antibody" }).click()
    const markers = page.getByRole("textbox", { name: "Marker name" })
    await markers.nth(0).fill("CD3")
    await markers.nth(1).fill("CD20")

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "fov.png", mimeType: "image/png", buffer: png })
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Next" }).click()
    await expect(dialog.getByText("Step 2 of 2")).toBeVisible()

    await dialog.getByRole("combobox", { name: "Colour of CD3 in this image" }).click()
    await page.getByRole("option", { name: "Green" }).click()
    await dialog.getByRole("checkbox", { name: "CD20" }).check()
    await dialog.getByRole("button", { name: "Add counterstain" }).click()
    await dialog.getByRole("combobox", { name: "Counterstain role" }).click()
    await page.getByRole("option", { name: "Nuclear" }).click()
    await dialog.getByRole("textbox", { name: "Counterstain name" }).fill("DAPI")
    await dialog.getByRole("button", { name: "Save image" }).click()

    await expect(page.getByRole("img", { name: "Image 1" })).toHaveCount(2)
    await expect(page.getByText("Counterstains: DAPI").first()).toBeVisible()

    await page.getByRole("button", { name: /Submit 2 reports/ }).click()
    await expect(page.getByRole("heading", { name: "Reports submitted" })).toBeVisible()

    const [cd3, cd20] = payload!.antibodies
    expect(cd3.images).toHaveLength(1)
    expect(cd20.images).toHaveLength(1)
    expect(cd3.images[0].url).toBe(cd20.images[0].url)
    expect(cd3.images[0].displayColor).toBe("#00ff00")
    expect(cd20.images[0].displayColor).toBeUndefined()
    expect(cd20.images[0].references).toEqual([{ role: "NUCLEAR", label: "DAPI" }])
  })

  test("the verdict, issues, specificity controls and concentration are submitted", async ({ page }) => {
    const png = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#204060" } })
      .png()
      .toBuffer()
    let payload: { antibodies: Record<string, unknown>[] } | undefined
    await page.route("**/api/reports/batch", async (route) => {
      payload = route.request().postDataJSON()
      await route.fulfill({ status: 201, json: { createdCount: 1, created: [{ experimentId: "x" }], failed: [] } })
    })

    await page.goto("/submit")
    await page.getByRole("textbox", { name: "Experiment name" }).fill("Assessment run")
    await page
      .getByRole("navigation", { name: "Submission steps" })
      .getByRole("button", { name: /Antibodies/ })
      .click()

    await page.getByRole("textbox", { name: "Marker name" }).fill("CD3")
    await page.getByRole("spinbutton", { name: "Concentration (µg/mL)" }).fill("2.5")
    await page.getByRole("radiogroup", { name: "Verdict" }).getByRole("radio", { name: "Usable with caveats" }).click()
    await page.getByRole("toolbar", { name: "Issues" }).getByRole("button", { name: "High background" }).click()
    await page
      .getByRole("radiogroup", { name: "Knockout or knockdown control" })
      .getByRole("radio", { name: "Supports" })
      .click()

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "fov.png", mimeType: "image/png", buffer: png })
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Next" }).click()
    await dialog.getByRole("button", { name: "Save image" }).click()

    await page.getByRole("button", { name: /Submit 1 report/ }).click()
    await expect(page.getByRole("heading", { name: "Reports submitted" })).toBeVisible()

    const [cd3] = payload!.antibodies
    expect(cd3.concentrationUgPerMl).toBe(2.5)
    expect(cd3.recommendation).toBe("WITH_CAVEATS")
    expect(cd3.issueIds).toEqual(["high-background"])
    expect(cd3.validations).toEqual([{ methodId: "knockout-control", result: "SUPPORTS" }])
  })

  test("breadcrumbs point back to the home page", async ({ page }) => {
    await page.goto("/submit")

    await page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: "Home" }).click()

    await expect(page).toHaveURL("/")
  })
})
