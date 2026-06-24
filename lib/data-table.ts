import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server"

export type SortOrder = "asc" | "desc"

export const DEFAULT_PAGE_SIZE = 20

export const sortParsers = {
  sort: parseAsString,
  order: parseAsStringEnum<SortOrder>(["asc", "desc"]).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
}

export const browseMarkerParsers = {
  ...sortParsers,
  q: parseAsString.withDefault(""),
  species: parseAsArrayOf(parseAsString).withDefault([]),
  method: parseAsArrayOf(parseAsString).withDefault([]),
  fixation: parseAsArrayOf(parseAsString).withDefault([]),
}

export type BrowseMarkerParams = {
  sort: string | null
  order: SortOrder
  page: number
  q: string
  species: string[]
  method: string[]
  fixation: string[]
}

export function isBrowseParamsActive(params: BrowseMarkerParams): boolean {
  return (
    params.q !== "" ||
    params.species.length > 0 ||
    params.method.length > 0 ||
    params.fixation.length > 0 ||
    params.sort !== null ||
    params.page !== 1
  )
}
