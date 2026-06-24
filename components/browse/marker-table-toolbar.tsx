"use client"

import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { browseMarkerParsers, FILTER_DIMENSIONS, FILTER_KEYS, isBrowseParamsActive } from "@/lib/data-table"
import type { BrowseFacets } from "@/models/experimental-report"
import { X } from "lucide-react"
import { useQueryStates } from "nuqs"
import { useEffect, useRef, useState } from "react"
import { BrowseModeTabs } from "./browse-mode-tabs"

const SEARCH_DEBOUNCE_MS = 300

export function MarkerTableToolbar({ facets }: { facets: BrowseFacets }) {
  const [params, setParams] = useQueryStates(browseMarkerParsers, { shallow: false })
  const [search, setSearch] = useState(params.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setSearch(params.q)
  }, [params.q])

  const onSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParams({ q: value || null, page: 1 })
    }, SEARCH_DEBOUNCE_MS)
  }

  const isActive = isBrowseParamsActive(params)

  const visibleDimensions = FILTER_DIMENSIONS.filter(
    (dimension) => dimension.tabs.includes(params.mode) && (facets[dimension.key]?.length ?? 0) > 0,
  )

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
        <Input
          placeholder="Search markers, cell types, tissues..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 w-[180px] lg:w-[280px]"
        />
      </div>
      {(visibleDimensions.length > 0 || isActive) && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleDimensions.map((dimension) => (
            <DataTableFacetedFilter
              key={dimension.key}
              title={dimension.title}
              options={facets[dimension.key] ?? []}
              value={(params[dimension.key as keyof typeof params] as string[]) ?? []}
              onChange={(value) =>
                setParams({ [dimension.key]: value.length ? value : null, page: 1 } as Parameters<typeof setParams>[0])
              }
            />
          ))}
          {isActive && (
            <Button variant="secondary" size="sm" className="h-8 px-2 lg:px-3" onClick={resetFilters}>
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
