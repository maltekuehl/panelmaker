import type { PanelCycleRow, PanelMarkerRow, PanelRow } from "./queries"

export type PanelMarkerResponse = PanelMarkerRow
export type PanelCycleResponse = PanelCycleRow

export type PanelResponse = Omit<PanelRow, "labShares"> & {
  sharedLabIds: string[]
  owningLab: { id: string; name: string; slug: string } | null
  visibility: string
}

export function toPanelMarkerResponse(marker: PanelMarkerRow): PanelMarkerResponse {
  return marker
}

export function toPanelCycleResponse(cycle: PanelCycleRow): PanelCycleResponse {
  return cycle
}

export function toPanelResponse(panel: PanelRow): PanelResponse {
  const { labShares, ...rest } = panel
  return {
    ...rest,
    sharedLabIds: labShares.map((s) => s.labId),
    owningLab: panel.owningLab ?? null,
    visibility: panel.visibility,
  }
}
