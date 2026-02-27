import type { ProteinRow } from "./queries"

export type ProteinResponse = ProteinRow

export function toProteinResponse(protein: ProteinRow): ProteinResponse {
  return protein
}
