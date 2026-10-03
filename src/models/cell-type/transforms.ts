import type { CellTypeRow, CellTypeWithRelations } from "./queries"

export type CellTypeResponse = CellTypeRow

export type CellTypeDetailResponse = CellTypeWithRelations

export function toCellTypeResponse(cellType: CellTypeRow): CellTypeResponse {
  return cellType
}

export function toCellTypeDetailResponse(cellType: CellTypeWithRelations): CellTypeDetailResponse {
  return cellType
}
