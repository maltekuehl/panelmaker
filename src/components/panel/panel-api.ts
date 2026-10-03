"use client"

type JsonMethod = "POST" | "PATCH" | "PUT" | "DELETE"

export function panelUrl(panelId: string): string {
  return `/api/panels/${panelId}`
}

export function sendJson(url: string, method: JsonMethod, body: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export function patchPanelMarker(panelId: string, data: Record<string, unknown>): Promise<Response> {
  return sendJson(`${panelUrl(panelId)}/markers`, "PATCH", data)
}

export interface NewPanelMarker {
  cycleId: string
  proteinId?: string
  proteinLabel?: string
  geneSymbol?: string
  ensemblGeneId?: string
  antibodyId?: string
  fluorophoreId?: string
}

export async function addPanelMarker(panelId: string, marker: NewPanelMarker): Promise<string | null> {
  const res = await sendJson(`${panelUrl(panelId)}/markers`, "POST", marker)
  if (res.ok) return null
  const json = await res.json().catch(() => ({}))
  return json.error ?? "Failed to add marker"
}
