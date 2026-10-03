import { LabLink } from "@/components/lab/lab-link"
import { LeaderboardFilters, type LeaderboardDimension } from "@/components/leaderboard/leaderboard-filters"
import { LabLeaderboardTable, LeaderboardTable } from "@/components/leaderboard/leaderboard-table"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"
import { getSessionUser, resolveViewerContext } from "@/lib/auth"
import {
  LEADERBOARD_FILTER_DIMENSIONS,
  LEADERBOARD_FILTER_KEYS,
  leaderboardParsers,
  type LeaderboardParams,
} from "@/lib/data-table"
import { getBrowseFacets, type BrowseFacets } from "@/models/experimental-report"
import { getLabsForUser, type LabWithRole } from "@/models/lab"
import type { ViewerContext } from "@/models/lab/access"
import {
  getLabLeaderboard,
  getLeaderboard,
  type LeaderboardFilters as CategoryFilters,
  type LeaderboardScope,
} from "@/models/user"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { createLoader, type SearchParams } from "nuqs/server"
import { cache, Suspense } from "react"

export const metadata: Metadata = {
  title: "Leaderboard | PanelMaker",
  description: "Top contributors on this instance. See who is driving spatial proteomics knowledge here.",
}

const LEADERBOARD_LIMIT = 50

const loadLeaderboardParams = createLoader(leaderboardParsers)

interface LeaderboardPageProps {
  searchParams: Promise<SearchParams>
}

// Public lane, cached. Takes the whole scope as an argument so every category (and every lab narrowing)
// gets its own cache entry, and reads no session: getLeaderboard never receives a viewer.
async function cachedGlobalLeaderboard(scope: LeaderboardScope) {
  "use cache"
  cacheLife("hours")
  cacheTag("browse")
  return getLeaderboard(LEADERBOARD_LIMIT, scope)
}

async function cachedFacets(): Promise<BrowseFacets> {
  "use cache"
  cacheLife("hours")
  cacheTag("browse-facets")
  return getBrowseFacets()
}

const labsForViewer = cache(async (userId: string): Promise<LabWithRole[]> => getLabsForUser(userId))

type ResolvedScope = {
  params: LeaderboardParams
  viewer: ViewerContext | null
  labs: LabWithRole[]
  selectedLabs: LabWithRole[]
  filters: CategoryFilters
  labFilterRejected: boolean
}

// Resolves the URL into a scope the queries can trust. A lab in the URL is never used as-is: it is
// matched against the labs the viewer is actually a member of, and anything else is dropped.
const resolveScope = cache(async (searchParams: Promise<SearchParams>): Promise<ResolvedScope> => {
  const params = await loadLeaderboardParams(searchParams)
  const user = await getSessionUser()
  const viewer = await resolveViewerContext(user?.id ?? null)
  const labs = user ? await labsForViewer(user.id) : []
  const selectedLabs = labs.filter((entry) => params.lab.includes(entry.lab.slug))

  return {
    params,
    viewer,
    labs,
    selectedLabs,
    filters: {
      speciesIds: params.species,
      tissueIds: params.tissue,
      methodIds: params.method,
      preservations: params.preservation,
      fixativeIds: params.fixative,
      conditionIds: params.condition,
    },
    labFilterRejected: params.lab.length > selectedLabs.length,
  }
})

function categoryLabel(facets: BrowseFacets, params: LeaderboardParams): string | null {
  const labels = LEADERBOARD_FILTER_KEYS.filter((key) => key !== "lab").flatMap((key) =>
    params[key].map((value) => facets[key]?.find((option) => option.value === value)?.label ?? value),
  )
  return labels.length > 0 ? labels.join(", ") : null
}

function BoardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

function FilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

async function LeaderboardFilterBar({ searchParams }: LeaderboardPageProps) {
  const [{ labs }, facets] = await Promise.all([resolveScope(searchParams), cachedFacets()])

  // The lab dimension is offered only for the labs the viewer belongs to, so a lab board can never be
  // requested for anyone else's lab.
  const options: Record<string, LeaderboardDimension["options"]> = {
    ...facets,
    lab: labs.map((entry) => ({ value: entry.lab.slug, label: entry.lab.name })),
  }

  const dimensions: LeaderboardDimension[] = LEADERBOARD_FILTER_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    title: dimension.title,
    options: options[dimension.key] ?? [],
  }))

  return <LeaderboardFilters dimensions={dimensions} />
}

async function LabBoard({
  lab,
  viewer,
  filters,
  category,
}: {
  lab: LabWithRole["lab"]
  viewer: ViewerContext
  filters: CategoryFilters
  category: string | null
}) {
  const entries = await getLabLeaderboard(lab.id, viewer, LEADERBOARD_LIMIT, filters)
  const totalReports = entries.reduce((sum, entry) => sum + entry.reportCount, 0)
  const labOnlyReports = entries.reduce((sum, entry) => sum + entry.labOnlyCount, 0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Inside {lab.name}</h2>
        <p className="text-sm text-muted-foreground">
          Members of <LabLink slug={lab.slug} name={lab.name} /> ranked by the reports this lab can see
          {category ? ` in ${category}` : ""}, including work shared with the lab but never published publicly.
        </p>
      </div>

      {totalReports === 0 && (
        <p className="text-sm text-muted-foreground">
          {category
            ? `No reports in ${category} from this lab yet. Members are listed with no score.`
            : "No reports from this lab yet. Ranking starts with the first submission."}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">This lab has no members to rank yet.</p>
      ) : (
        <>
          <LabLeaderboardTable entries={entries} />
          <p className="text-sm text-muted-foreground">
            {entries.length === 1
              ? "You are the only member of this lab so far."
              : `${entries.length} people, ${totalReports} reports, ${labOnlyReports} of them visible only inside the lab.`}
          </p>
        </>
      )}
    </div>
  )
}

// Viewer-dependent, therefore never cached: it reads the session to resolve lab membership and returns
// work that is only visible inside a lab.
async function LabBoardSection({ searchParams }: LeaderboardPageProps) {
  const { viewer, labs, selectedLabs, filters, params, labFilterRejected } = await resolveScope(searchParams)
  if (!viewer || labs.length === 0) return null

  const boards = selectedLabs.length > 0 ? selectedLabs : labs.slice(0, 1)
  const facets = await cachedFacets()
  const category = categoryLabel(facets, params)

  return (
    <div className="space-y-6">
      {labFilterRejected && (
        <p className="text-sm text-muted-foreground">One of the labs in this link is not yours, so it is left out.</p>
      )}
      {boards.map((entry, index) => (
        <div key={entry.lab.id} className={index > 0 ? "border-t pt-6" : ""}>
          <LabBoard lab={entry.lab} viewer={viewer} filters={filters} category={category} />
        </div>
      ))}
    </div>
  )
}

async function GlobalBoardSection({ searchParams }: LeaderboardPageProps) {
  const { selectedLabs, filters, params } = await resolveScope(searchParams)

  const scope: LeaderboardScope = { ...filters, labIds: selectedLabs.map((entry) => entry.lab.id) }
  const [entries, facets] = await Promise.all([cachedGlobalLeaderboard(scope), cachedFacets()])

  const category = categoryLabel(facets, params)
  const labNames = selectedLabs.map((entry) => entry.lab.name).join(", ")

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Top contributors</h2>
        <p className="text-sm text-muted-foreground">
          Ranked by public experimental reports
          {category ? ` in ${category}` : ""}
          {labNames ? ` from ${labNames}` : ""}. Work kept inside a lab is never counted here.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {category || labNames ? "No public reports match these filters yet." : "No contributors yet."}
        </p>
      ) : (
        <LeaderboardTable entries={entries} />
      )}
    </div>
  )
}

export default function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <CustomBreadcrumbs items={[{ label: "Community" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-muted-foreground">
          Recognising the contributors building spatial proteomics knowledge on this instance.
        </p>
      </div>
      <Suspense fallback={<FilterSkeleton />}>
        <LeaderboardFilterBar searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <LabBoardSection searchParams={searchParams} />
      </Suspense>
      <div className="border-t pt-6">
        <Suspense fallback={<BoardSkeleton />}>
          <GlobalBoardSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
