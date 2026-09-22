import { expect, test } from "@playwright/test"
import { STORAGE_STATE } from "./test-helpers"

test.describe("API Endpoints", () => {
  test("GET /api/health reports a healthy service", async ({ request }) => {
    const response = await request.get("/api/health")
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBe("healthy")
    expect(body.checks.database).toBe(true)
  })

  test.describe("Public API - Proteins", () => {
    test("GET /api/proteins returns a proteins array", async ({ request }) => {
      const response = await request.get("/api/proteins")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body.proteins)).toBe(true)
    })

    test("GET /api/proteins supports a search query", async ({ request }) => {
      const response = await request.get("/api/proteins?q=CD3")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body.proteins)).toBe(true)
    })

    test("GET /api/proteins honours the limit parameter", async ({ request }) => {
      const response = await request.get("/api/proteins?limit=5")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.proteins.length).toBeLessThanOrEqual(5)
    })
  })

  test.describe("Public API - Cell Types", () => {
    test("GET /api/cell-types returns a cellTypes array", async ({ request }) => {
      const response = await request.get("/api/cell-types")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body.cellTypes)).toBe(true)
    })

    test("GET /api/cell-types supports a search query", async ({ request }) => {
      const response = await request.get("/api/cell-types?q=T+cell")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body.cellTypes)).toBe(true)
    })
  })

  test.describe("Protected API - Panels without a session", () => {
    test("GET /api/panels returns 401", async ({ request }) => {
      const response = await request.get("/api/panels")
      expect(response.status()).toBe(401)
    })

    test("POST /api/panels returns 401", async ({ request }) => {
      const response = await request.post("/api/panels", { data: { name: "Test Panel" } })
      expect(response.status()).toBe(401)
    })
  })

  test.describe("Protected API - Panels with a session", () => {
    test.use({ storageState: STORAGE_STATE })

    test("GET /api/panels returns a panels array", async ({ request }) => {
      const response = await request.get("/api/panels")
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body.panels)).toBe(true)
    })
  })
})
