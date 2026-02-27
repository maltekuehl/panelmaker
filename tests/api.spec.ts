import { expect, test } from "@playwright/test"

test.describe("API Endpoints", () => {
  test("should have working health endpoint", async ({ request }) => {
    const response = await request.get("/api/health")
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty("status")
  })

  test.describe("Public API - Proteins", () => {
    test("GET /api/proteins should return proteins array", async ({ request }) => {
      const response = await request.get("/api/proteins")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty("success")
      expect(body).toHaveProperty("data")
      expect(body.data).toHaveProperty("proteins")
      expect(Array.isArray(body.data.proteins)).toBeTruthy()
    })

    test("GET /api/proteins should support search query", async ({ request }) => {
      const response = await request.get("/api/proteins?q=CD4")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.data).toHaveProperty("proteins")
      expect(Array.isArray(body.data.proteins)).toBeTruthy()
    })

    test("GET /api/proteins should support limit parameter", async ({ request }) => {
      const response = await request.get("/api/proteins?limit=5")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.data.proteins.length).toBeLessThanOrEqual(5)
    })
  })

  test.describe("Public API - Cell Types", () => {
    test("GET /api/cell-types should return cell types array", async ({ request }) => {
      const response = await request.get("/api/cell-types")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty("success")
      expect(body).toHaveProperty("data")
      expect(body.data).toHaveProperty("cellTypes")
      expect(Array.isArray(body.data.cellTypes)).toBeTruthy()
    })

    test("GET /api/cell-types should support search query", async ({ request }) => {
      const response = await request.get("/api/cell-types?q=T+cell")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.data).toHaveProperty("cellTypes")
      expect(Array.isArray(body.data.cellTypes)).toBeTruthy()
    })
  })

  test.describe("Protected API - Panels", () => {
    test("GET /api/panels without auth should return 401", async ({ request }) => {
      const response = await request.get("/api/panels")
      expect(response.status()).toBe(401)
    })

    test("POST /api/panels without auth should return 401", async ({ request }) => {
      const response = await request.post("/api/panels", {
        data: { name: "Test Panel" },
      })
      expect(response.status()).toBe(401)
    })

    test("GET /api/panels with test credentials should return panels array", async ({ page, request }) => {
      // First, authenticate using the test credentials page
      await page.goto("/signin")
      await page.waitForLoadState("networkidle")

      const passwordField = page.locator('input[type="password"]').first()
      const isTestMode = (await passwordField.count()) > 0

      if (isTestMode) {
        await passwordField.fill("password")
        await page.getByRole("button", { name: "Sign In with Test Credentials" }).click()
        await page.waitForURL("/")

        // Get the session cookie
        const cookies = await page.context().cookies()
        const authHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

        // Now test the API with the session
        const response = await request.get("/api/panels", {
          headers: {
            cookie: authHeader,
          },
        })
        expect(response.status()).toBe(200)

        const body = await response.json()
        expect(body).toHaveProperty("success")
        expect(body.data).toHaveProperty("panels")
        expect(Array.isArray(body.data.panels)).toBeTruthy()
      } else {
        test.skip()
      }
    })
  })
})
