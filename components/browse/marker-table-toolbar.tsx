"use client"

import { FacetSearch } from "@/components/data-table/facet-search"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { BalancedGrid } from "@/components/shared/balanced-grid"
import { Button } from "@/components/ui/button"
import {
  browseMarkerParsers,
  FILTER_DIMENSIONS,
  FILTER_KEYS,
  isBrowseParamsActive,
  type BrowseMode,
} from "@/lib/data-table"
import type { BrowseFacets } from "@/models/experimental-report"
import { X } from "lucide-react"
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

  const selectFacet = (key: string, value: string) => {
    const current = (params[key as keyof typeof params] as string[]) ?? []
    setParams({ [key]: [...current, value], q: null, page: 1 } as Parameters<typeof setParams>[0])
  }

  const resetFilters = () =>
    setParams({
      q: null,
      sort: null,
      order: null,
      page: null,
      ...Object.fromEntries(FILTER_KEYS.map((key) => [key, null])),
    } as Parameters<typeof setParams>[0])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
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
            selected: (params[dimension.key as keyof typeof params] as string[]) ?? [],
          }))}
          className="w-full sm:w-[320px] lg:w-[400px]"
        />
      </div>
      {(visibleDimensions.length > 0 || isActive) && (
        <BalancedGrid>
          {visibleDimensions.map((dimension) => (
            <DataTableFacetedFilter
              key={dimension.key}
              className="w-full justify-start overflow-hidden"
              title={dimension.title}
              options={facets[dimension.key] ?? []}
              value={(params[dimension.key as keyof typeof params] as string[]) ?? []}
              onChange={(value) =>
                setParams({ [dimension.key]: value.length ? value : null, page: 1 } as Parameters<typeof setParams>[0])
              }
            />
          ))}
          {isActive && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-full justify-start px-2 lg:px-3"
              onClick={resetFilters}
            >
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </BalancedGrid>
      )}
    </div>
  )
}
