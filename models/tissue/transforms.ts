import { parseJsonArray } from "@/lib/transforms"
import type { TissueRow } from "./queries"

export type TissueResponse = Omit<TissueRow, "partOfIds"> & {
  partOfIds: string[]
}

export function toTissueResponse(tissue: TissueRow): TissueResponse {
  return {
    ...tissue,
    partOfIds: parseJsonArray(tissue.partOfIds),
  }
}
