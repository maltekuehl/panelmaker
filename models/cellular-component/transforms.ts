import { parseJsonArray } from "@/lib/transforms"
import type { CellularComponentRow } from "./queries"

export type CellularComponentResponse = Omit<CellularComponentRow, "partOfIds"> & {
  partOfIds: string[]
}

export function toCellularComponentResponse(component: CellularComponentRow): CellularComponentResponse {
  return {
    ...component,
    partOfIds: parseJsonArray(component.partOfIds),
  }
}
