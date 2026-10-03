import type { ImagingMethodRow } from "./queries"

export type ImagingMethodResponse = {
  id: string
  label: string
  parent: { id: string; label: string } | null
}

export function toImagingMethodResponse(method: ImagingMethodRow): ImagingMethodResponse {
  return { id: method.id, label: method.label, parent: method.parent }
}
