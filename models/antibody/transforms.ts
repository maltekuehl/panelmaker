import type { AntibodyRow } from "./queries"

export type AntibodyResponse = Omit<AntibodyRow, "targetSpecies" | "applications"> & {
  targetSpecies: string[]
  applications: string[]
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toAntibodyResponse(antibody: AntibodyRow): AntibodyResponse {
  return {
    ...antibody,
    targetSpecies: parseJsonArray(antibody.targetSpecies),
    applications: parseJsonArray(antibody.applications),
  }
}
