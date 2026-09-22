import type { ImagingMethodRow } from "./queries"

export type ImagingMethodResponse = {
  id: string
  label: string
  shortLabel: string
  efoId: string | null
  detection: "FLUORESCENCE" | "MASS" | "OTHER"
  cyclic: boolean
  aliases: string[]
  needsFluorophore: boolean
  needsMetalTag: boolean
}

export function toImagingMethodResponse(method: ImagingMethodRow): ImagingMethodResponse {
  return {
    id: method.id,
    label: method.label,
    shortLabel: method.shortLabel,
    efoId: method.efoId,
    detection: method.detection,
    cyclic: method.cyclic,
    aliases: method.aliases,
    needsFluorophore: method.detection === "FLUORESCENCE",
    needsMetalTag: method.detection === "MASS",
  }
}
