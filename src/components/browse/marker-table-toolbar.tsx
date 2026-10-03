"use client"

import { FacetSearch } from "@/components/data-table/facet-search"
import { clearedTableParams, FacetFilterToolbar } from "@/components/filter-toolbar"
import {
  browseMarkerParsers,
  FILTER_DIMENSIONS,
  FILTER_KEYS,
  isBrowseParamsActive,
  type BrowseMode,
} from "@/lib/data-table"
import type { BrowseFacets } from "@/models/experimental-report"
import { useQueryStates } from "nuqs"
import { BrowseModeTabs } from "./browse-mode-tabs"

const SEARCH_PLACEHOLDERS: Record<BrowseMode, string> = {
  markers: "Search markers, antibodies, RRIDs, clones",
  antibodies: "Search antibody name, RRID, clone, catalog number",
  reports: "Search antibodies, RRIDs, experiments, notes",
  experiments: "Search experiment name, description, DOI",
  panels: "Search panel name or description",
}

export function MarkerTableToolbar({ facets }: { facets: BrowseFacets }) {
  const [params, setParams] = useQueryStates(browseMarkerParsers, { shallow: false })

  const isActive = isBrowseParamsActive(params)

  const visibleDimensions = FILTER_DIMENSIONS.filter(
    (dimension) => dimension.tabs.includes(params.mode) && (facets[dimension.key]?.length ?? 0) > 0,
  )

  const selected = (key: string) => (params[key as keyof typeof params] as string[]) ?? []

  const selectFacet = (key: string, value: string) =>
    setParams({ [key]: [...selected(key), value], q: null, page: 1 } as Parameters<typeof setParams>[0])

  return (
    <FacetFilterToolbar
      onReset={() => setParams(clearedTableParams(FILTER_KEYS) as Parameters<typeof setParams>[0])}
      isActive={isActive}
      dimensions={visibleDimensions}
      facets={facets}
      selected={selected}
      onFilterChange={(key, value) =>
        setParams({ [key]: value.length ? value : null, page: 1 } as Parameters<typeof setParams>[0])
      }
    >
      <BrowseModeTabs />
      <FacetSearch
        key={params.mode}
        placeholder={SEARCH_PLACEHOLDERS[params.mode]}
        value={params.q}
        onCommit={(q) => setParams({ q: q || null, page: 1 })}
        onSelectFacet={selectFacet}
        facets={visibleDimensions.map((dimension) => ({
          key: dimension.key,
          title: dimension.title,
          options: facets[dimension.key] ?? [],
          selected: selected(dimension.key),
        }))}
        className="w-full sm:w-[320px] lg:w-[400px]"
      />
    </FacetFilterToolbar>
  )
}
