import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server"

export type SortOrder = "asc" | "desc"

export const DEFAULT_PAGE_SIZE = 20

export const sortParsers = {
  sort: parseAsString,
  order: parseAsStringEnum<SortOrder>(["asc", "desc"]).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
}

export type BrowseMode = "markers" | "antibodies" | "reports" | "experiments" | "panels"

export const BROWSE_MODES: BrowseMode[] = ["markers", "antibodies", "reports", "experiments", "panels"]

export type FilterDimension = {
  key: string
  title: string
  tabs: BrowseMode[]
}

export const FILTER_DIMENSIONS: FilterDimension[] = [
  { key: "species", title: "Species", tabs: ["markers", "antibodies", "reports", "experiments", "panels"] },
  { key: "tissue", title: "Tissue", tabs: ["markers", "reports", "experiments"] },
  { key: "method", title: "Method", tabs: ["markers", "reports", "experiments"] },
  { key: "fixation", title: "Fixation", tabs: ["markers", "reports", "experiments", "panels"] },
  { key: "vendor", title: "Vendor", tabs: ["markers", "antibodies", "reports"] },
  { key: "host", title: "Host", tabs: ["markers", "antibodies", "reports"] },
  { key: "conjugate", title: "Label", tabs: ["antibodies", "reports"] },
  { key: "clonality", title: "Clonality", tabs: ["antibodies", "reports"] },
  { key: "subcellular", title: "Subcellular", tabs: ["markers", "reports"] },
  { key: "condition", title: "Condition", tabs: ["markers", "reports", "experiments", "panels"] },
  { key: "specificity", title: "Specificity", tabs: ["markers", "reports"] },
  { key: "result", title: "Result", tabs: ["markers", "reports"] },
  { key: "lab", title: "Lab", tabs: ["markers", "antibodies", "reports", "experiments", "panels"] },
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
  lab: filterArrayParser,
  mode: parseAsStringEnum<BrowseMode>(BROWSE_MODES).withDefault("markers"),
}

// Shared shape for every faceted/sorted/paged entry table (browse modes and the lab overview).
export type EntryFilterParams = {
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
  lab: string[]
}

export type BrowseMarkerParams = EntryFilterParams & { mode: BrowseMode }

export function isBrowseParamsActive(params: BrowseMarkerParams): boolean {
  if (params.q !== "" || params.sort !== null || params.page !== 1) return true
  return FILTER_KEYS.some((key) => (params[key as keyof BrowseMarkerParams] as string[]).length > 0)
}

// Lab antibody inventory: server-side search + status/host/clonality filters + sorting + paging
// (the inventory can be large, ~hundreds of antibodies).
export const labInventoryParsers = {
  ...sortParsers,
  q: parseAsString.withDefault(""),
  status: filterArrayParser,
  host: filterArrayParser,
  clonality: filterArrayParser,
}

export type LabInventoryParams = {
  sort: string | null
  order: SortOrder
  page: number
  q: string
  status: string[]
  host: string[]
  clonality: string[]
}

export function isInventoryParamsActive(params: LabInventoryParams): boolean {
  return (
    params.q !== "" ||
    params.status.length > 0 ||
    params.host.length > 0 ||
    params.clonality.length > 0 ||
    params.sort !== null
  )
}

// Lab overview tabs (experiments / reports / panels): the same server-side search + faceted filters +
// sorting + paging surface as browse, scoped to a single lab. Shares sortParsers so DataTableColumnHeader
// and DataTablePagination drive sort/order/page out of the box.
export type LabView = "experiments" | "reports" | "panels"

export const LAB_VIEWS: LabView[] = ["experiments", "reports", "panels"]

export const labContentParsers = {
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
  lab: filterArrayParser,
  view: parseAsStringEnum<LabView>(LAB_VIEWS).withDefault("experiments"),
}

export type LabContentParams = EntryFilterParams & { view: LabView }

// The facet dimensions shown on the lab overview: the shared browse dimensions minus "lab"
// (the page is already scoped to one lab, so a lab filter is meaningless here).
export const LAB_FILTER_DIMENSIONS = FILTER_DIMENSIONS.filter((dimension) => dimension.key !== "lab")

export function isLabContentParamsActive(params: LabContentParams): boolean {
  if (params.q !== "" || params.sort !== null || params.page !== 1) return true
  return LAB_FILTER_DIMENSIONS.some(
    (dimension) => (params[dimension.key as keyof LabContentParams] as string[]).length > 0,
  )
}
