import type { CellTypeRow, CellTypeWithRelations } from "./queries"

export type CellTypeResponse = Omit<CellTypeRow, "parentIds"> & {
  parentIds: string[]
}

export type CellTypeDetailResponse = Omit<CellTypeWithRelations, "parentIds"> & {
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

export function toCellTypeResponse(cellType: CellTypeRow): CellTypeResponse {
  return {
    ...cellType,
    parentIds: parseJsonArray(cellType.parentIds),
  }
}

export function toCellTypeDetailResponse(cellType: CellTypeWithRelations): CellTypeDetailResponse {
  return {
    ...cellType,
    parentIds: parseJsonArray(cellType.parentIds),
  }
}
