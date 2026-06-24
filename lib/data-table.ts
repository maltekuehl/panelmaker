import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server"

export type SortOrder = "asc" | "desc"

export const DEFAULT_PAGE_SIZE = 20

export const sortParsers = {
  sort: parseAsString,
  order: parseAsStringEnum<SortOrder>(["asc", "desc"]).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
}

export type BrowseMode = "markers" | "antibodies" | "reports" | "experiments"

export const BROWSE_MODES: BrowseMode[] = ["markers", "antibodies", "reports", "experiments"]

export type FilterDimension = {
  key: string
  title: string
  tabs: BrowseMode[]
}

export const FILTER_DIMENSIONS: FilterDimension[] = [
  { key: "species", title: "Species", tabs: ["markers", "antibodies", "reports", "experiments"] },
  { key: "tissue", title: "Tissue", tabs: ["markers", "reports", "experiments"] },
  { key: "method", title: "Method", tabs: ["markers", "reports", "experiments"] },
  { key: "fixation", title: "Fixation", tabs: ["markers", "reports", "experiments"] },
  { key: "vendor", title: "Vendor", tabs: ["markers", "antibodies", "reports"] },
  { key: "host", title: "Host", tabs: ["markers", "antibodies", "reports"] },
  { key: "conjugate", title: "Label", tabs: ["antibodies", "reports"] },
  { key: "clonality", title: "Clonality", tabs: ["antibodies", "reports"] },
  { key: "subcellular", title: "Subcellular", tabs: ["markers", "reports"] },
  { key: "condition", title: "Condition", tabs: ["markers", "reports", "experiments"] },
  { key: "specificity", title: "Specificity", tabs: ["markers", "reports"] },
  { key: "result", title: "Result", tabs: ["markers", "reports"] },
]

export const FILTER_KEYS = FILTER_DIMENSIONS.map((d) => d.key)

const filterArrayParser = parseAsArrayOf(parseAsString).withDefault([])

export const browseMarkerParsers = {
  ...sortParsers,
  q: parseAsString.withDefault(""),
  species: filterArrayParser,
  tissue: filterArrayParser,
  method: filterArrayParser,
  fixation: filterArrayParser,
  vendor: filterArrayParser,
  host: filterArrayParser,
  conjugate: filterArrayParser,
  clonality: filterArrayParser,
  subcellular: filterArrayParser,
  condition: filterArrayParser,
  specificity: filterArrayParser,
  result: filterArrayParser,
  mode: parseAsStringEnum<BrowseMode>(BROWSE_MODES).withDefault("markers"),
}

export type BrowseMarkerParams = {
  sort: string | null
  order: SortOrder
  page: number
  q: string
  species: string[]
  tissue: string[]
  method: string[]
  fixation: string[]
  vendor: string[]
  host: string[]
  conjugate: string[]
  clonality: string[]
  subcellular: string[]
  condition: string[]
  specificity: string[]
  result: string[]
  mode: BrowseMode
}

export function isBrowseParamsActive(params: BrowseMarkerParams): boolean {
  if (params.q !== "" || params.sort !== null || params.page !== 1) return true
  return FILTER_KEYS.some((key) => (params[key as keyof BrowseMarkerParams] as string[]).length > 0)
}
