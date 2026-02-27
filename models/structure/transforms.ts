import type { StructureCellTypeRow, StructureRow } from "./queries"

export type StructureResponse = Omit<StructureRow, "partOfIds"> & {
  partOfIds: string[]
}

export type StructureCellTypeResponse = Omit<StructureCellTypeRow, "parentIds"> & {
  parentIds: string[]
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toStructureResponse(structure: StructureRow): StructureResponse {
  return {
    ...structure,
    partOfIds: parseJsonArray(structure.partOfIds),
  }
}

export function toStructureCellTypeResponse(cellType: StructureCellTypeRow): StructureCellTypeResponse {
  return {
    ...cellType,
    parentIds: parseJsonArray(cellType.parentIds),
  }
}
