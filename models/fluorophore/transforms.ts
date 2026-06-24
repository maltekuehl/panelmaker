import type { FluorophoreRow } from "./queries"

export type FluorophoreResponse = {
  id: string
  name: string
  excitation: number
  emission: number
  fpbaseId: string | null
  chebiId: string | null
  aliases: string[]
}

export function toFluorophoreResponse(fluorophore: FluorophoreRow): FluorophoreResponse {
  return {
    id: fluorophore.id,
    name: fluorophore.name,
    excitation: fluorophore.excitation,
    emission: fluorophore.emission,
    fpbaseId: fluorophore.fpbaseId,
    chebiId: fluorophore.chebiId,
    aliases: fluorophore.aliases,
  }
}
