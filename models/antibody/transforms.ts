import { parseJsonArray } from "@/lib/transforms"
import type { AntibodyRow } from "./queries"

export type AntibodyResponse = Omit<AntibodyRow, "targetSpecies" | "applications"> & {
  targetSpecies: string[]
  applications: string[]
}

export function toAntibodyResponse(antibody: AntibodyRow): AntibodyResponse {
  return {
    ...antibody,
    targetSpecies: parseJsonArray(antibody.targetSpecies),
    applications: parseJsonArray(antibody.applications),
  }
}
