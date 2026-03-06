import { parseJsonArray } from "@/lib/transforms"
import type { CellTypeRow, CellTypeWithRelations } from "./queries"

export type CellTypeResponse = Omit<CellTypeRow, "parentIds"> & {
  parentIds: string[]
}

export type CellTypeDetailResponse = Omit<CellTypeWithRelations, "parentIds"> & {
  parentIds: string[]
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
