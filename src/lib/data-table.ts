import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server"

export type SortOrder = "asc" | "desc"

export const DEFAULT_PAGE_SIZE = 20

// Browse and lab tables aggregate and sort in memory, over at most this many source rows.
export const BROWSE_AGGREGATION_CAP = 2000

export type EntriesPage<T> = {
  rows: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export function paginate<T>(rows: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): EntriesPage<T> {
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  return { rows: rows.slice((current - 1) * pageSize, current * pageSize), total, page: current, pageSize, pageCount }
}

export type SortAccessor<T> = (entry: T) => string | number

export function sortEntries<T>(
  entries: T[],
  accessors: Record<string, SortAccessor<T>>,
  sort?: string | null,
  order: string = "desc",
): T[] {
  const accessor = sort ? accessors[sort] : undefined
  if (!accessor) return entries

  const direction = order === "asc" ? 1 : -1
  return [...entries].sort((a, b) => {
    const aValue = accessor(a)
    const bValue = accessor(b)
    if (aValue < bValue) return -direction
    if (aValue > bValue) return direction
    return 0
  })
}

export const sortParsers = {
  sort: parseAsString,
  order: parseAsStringEnum<SortOrder>(["asc", "desc"]).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
}

export type BrowseMode = "markers" | "antibodies" | "reports" | "experiments" | "panels"

const BROWSE_MODES: BrowseMode[] = ["antibodies", "markers", "reports", "experiments", "panels"]

export type FilterDimension = {
  key: string
  title: string
  tabs: BrowseMode[]
}

const REPORT_MODES: BrowseMode[] = ["markers", "antibodies", "reports", "experiments"]

// Markers, antibodies and reports are all rolled up from reports, so every dimension applies to them.
// Experiments match through their own fields or any of their reports, panels through their own fields or
// any of their antibodies. Panels carry no tissue, cell type or validation outcome, so those stay off.
export const FILTER_DIMENSIONS: FilterDimension[] = [
  { key: "marker", title: "Marker", tabs: BROWSE_MODES },
  { key: "cellType", title: "Cell type", tabs: REPORT_MODES },
  { key: "species", title: "Sample species", tabs: BROWSE_MODES },
  { key: "tissue", title: "Tissue", tabs: REPORT_MODES },
  { key: "method", title: "Method", tabs: BROWSE_MODES },
  { key: "preservation", title: "Preservation", tabs: BROWSE_MODES },
  { key: "fixative", title: "Fixative", tabs: BROWSE_MODES },
  { key: "vendor", title: "Vendor", tabs: BROWSE_MODES },
  { key: "host", title: "Antibody host", tabs: BROWSE_MODES },
  { key: "conjugate", title: "Label", tabs: BROWSE_MODES },
  { key: "clonality", title: "Clonality", tabs: BROWSE_MODES },
  { key: "subcellular", title: "Subcellular", tabs: REPORT_MODES },
  { key: "condition", title: "Condition", tabs: BROWSE_MODES },
  { key: "recommendation", title: "Recommendation", tabs: REPORT_MODES },
  { key: "validation", title: "Specificity control", tabs: REPORT_MODES },
  { key: "issue", title: "Issue", tabs: REPORT_MODES },
  { key: "lab", title: "Lab", tabs: BROWSE_MODES },
  { key: "source", title: "Source", tabs: REPORT_MODES },
]

export const FILTER_KEYS = FILTER_DIMENSIONS.map((d) => d.key)

const filterArrayParser = parseAsArrayOf(parseAsString).withDefault([])

function filterArrayParsers<K extends string>(keys: readonly string[]): Record<K, typeof filterArrayParser> {
  return Object.fromEntries(keys.map((key) => [key, filterArrayParser])) as Record<K, typeof filterArrayParser>
}

type FilterKey = Exclude<keyof EntryFilterParams, "sort" | "order" | "page" | "q">

// Search, sort, paging and every facet dimension, shared by browse and the lab overview.
const entryFilterParsers = {
  ...sortParsers,
  q: parseAsString.withDefault(""),
  ...filterArrayParsers<FilterKey>(FILTER_KEYS),
}

export const browseMarkerParsers = {
  ...entryFilterParsers,
  mode: parseAsStringEnum<BrowseMode>(BROWSE_MODES).withDefault("antibodies"),
}

// Shared shape for every faceted/sorted/paged entry table (browse modes and the lab overview).
export type EntryFilterParams = {
  sort: string | null
  order: SortOrder
  page: number
  q: string
  marker: string[]
  cellType: string[]
  species: string[]
  tissue: string[]
  method: string[]
  preservation: string[]
  fixative: string[]
  vendor: string[]
  host: string[]
  conjugate: string[]
  clonality: string[]
  subcellular: string[]
  condition: string[]
  recommendation: string[]
  validation: string[]
  issue: string[]
  lab: string[]
  source: string[]
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

const LAB_VIEWS: LabView[] = ["experiments", "reports", "panels"]

export const labContentParsers = {
  ...entryFilterParsers,
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

// Community leaderboard: the same faceted multi-select surface as browse, minus search, sort and paging.
// A lab value is a lab slug (matched against the viewer's memberships server side); every other value is
// the same id browse filters on, so a link means the same thing in both places. Only experiment-level
// dimensions are offered, because the board credits whole experiments.
export const LEADERBOARD_FILTER_KEYS = [
  "lab",
  "species",
  "tissue",
  "method",
  "preservation",
  "fixative",
  "condition",
] as const

export type LeaderboardFilterKey = (typeof LEADERBOARD_FILTER_KEYS)[number]

export const leaderboardParsers = filterArrayParsers<LeaderboardFilterKey>(LEADERBOARD_FILTER_KEYS)

export type LeaderboardParams = Record<LeaderboardFilterKey, string[]>

// Reuses the browse dimension titles, reordered so the lab a viewer belongs to leads.
export const LEADERBOARD_FILTER_DIMENSIONS: FilterDimension[] = FILTER_DIMENSIONS.filter((dimension) =>
  LEADERBOARD_FILTER_KEYS.includes(dimension.key as LeaderboardFilterKey),
).sort(
  (a, b) =>
    LEADERBOARD_FILTER_KEYS.indexOf(a.key as LeaderboardFilterKey) -
    LEADERBOARD_FILTER_KEYS.indexOf(b.key as LeaderboardFilterKey),
)

export function isLeaderboardParamsActive(params: LeaderboardParams): boolean {
  return LEADERBOARD_FILTER_KEYS.some((key) => params[key].length > 0)
}
