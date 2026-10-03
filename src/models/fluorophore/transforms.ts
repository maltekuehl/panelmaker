import type { FluorophoreRow } from "./queries"
import { fluorophoreBrightness } from "./spectra"

export type FluorophoreResponse = {
  id: string
  name: string
  excitation: number
  emission: number
  fpbaseId: string | null
  fpbaseSlug: string | null
  chebiId: string | null
  aliases: string[]
  extinctionCoefficient: number | null
  quantumYield: number | null
  brightness: number | null
}

export function toFluorophoreResponse(fluorophore: FluorophoreRow): FluorophoreResponse {
  return {
    id: fluorophore.id,
    name: fluorophore.name,
    excitation: fluorophore.excitation,
    emission: fluorophore.emission,
    fpbaseId: fluorophore.fpbaseId,
    fpbaseSlug: fluorophore.fpbaseSlug,
    chebiId: fluorophore.chebiId,
    aliases: fluorophore.aliases,
    extinctionCoefficient: fluorophore.extinctionCoefficient,
    quantumYield: fluorophore.quantumYield,
    brightness: fluorophoreBrightness(fluorophore),
  }
}
