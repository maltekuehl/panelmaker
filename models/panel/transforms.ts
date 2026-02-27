import type { PanelCycleRow, PanelMarkerRow, PanelRow } from "./queries"

export type PanelMarkerResponse = PanelMarkerRow
export type PanelCycleResponse = PanelCycleRow
export type PanelResponse = PanelRow

export function toPanelMarkerResponse(marker: PanelMarkerRow): PanelMarkerResponse {
  return marker
}

export function toPanelCycleResponse(cycle: PanelCycleRow): PanelCycleResponse {
  return cycle
}

export function toPanelResponse(panel: PanelRow): PanelResponse {
  return panel
}
