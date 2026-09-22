import { expect, test } from "@playwright/test"
import { SEEDED, STORAGE_STATE } from "./test-helpers"

test.describe("Panel mutations with a session", () => {
  test.use({ storageState: STORAGE_STATE })

  test("creates a panel, adds a cycle and a marker, then reads it back", async ({ request }) => {
    const panelName = `E2E panel ${Date.now()}`

    const createPanel = await request.post("/api/panels", {
      data: { name: panelName, description: "Created by the Playwright suite" },
    })
    expect(createPanel.status()).toBe(201)

    const { panel } = await createPanel.json()
    expect(panel.name).toBe(panelName)
    expect(typeof panel.id).toBe("string")

    try {
      const createCycle = await request.post(`/api/panels/${panel.id}/cycles`, {
        data: { name: "Cycle 1", notes: "First round" },
      })
      expect(createCycle.status()).toBe(201)

      const { cycle } = await createCycle.json()
      expect(cycle.name).toBe("Cycle 1")
      expect(cycle.panelId).toBe(panel.id)

      const addMarker = await request.post(`/api/panels/${panel.id}/markers`, {
        data: { cycleId: cycle.id, proteinId: SEEDED.PROTEIN_ID },
      })
      expect(addMarker.status()).toBe(201)

      const { marker } = await addMarker.json()
      expect(marker.proteinId).toBe(SEEDED.PROTEIN_ID)

      const readBack = await request.get(`/api/panels/${panel.id}`)
      expect(readBack.status()).toBe(200)

      const saved = (await readBack.json()).panel
      expect(saved.id).toBe(panel.id)
      expect(saved.cycles).toHaveLength(1)
      expect(saved.cycles[0].id).toBe(cycle.id)
      expect(saved.cycles[0].markers.map((m: { id: string }) => m.id)).toContain(marker.id)

      const removeMarker = await request.delete(`/api/panels/${panel.id}/markers`, {
        data: { markerId: marker.id },
      })
      expect(removeMarker.status()).toBe(200)
    } finally {
      const deletePanel = await request.delete(`/api/panels/${panel.id}`)
      expect(deletePanel.status()).toBe(200)
    }

    const gone = await request.get(`/api/panels/${panel.id}`)
    expect(gone.status()).toBe(404)
  })

  test("rejects a cycle on a panel that does not exist", async ({ request }) => {
    const response = await request.post("/api/panels/does-not-exist/cycles", { data: { name: "Cycle 1" } })

    expect(response.status()).toBe(404)
  })

  test("rejects a panel payload that fails validation", async ({ request }) => {
    const response = await request.post("/api/panels", { data: { name: "" } })

    expect(response.status()).toBe(400)
  })
})

test.describe("Panel mutations without a session", () => {
  test("POST /api/panels is rejected", async ({ request }) => {
    const response = await request.post("/api/panels", { data: { name: "Unauthenticated panel" } })

    expect(response.status()).toBe(401)
  })
})
