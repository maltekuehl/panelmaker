"use client"

import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { BalancedGrid } from "@/components/shared/balanced-grid"
import { Button } from "@/components/ui/button"
import type { FilterDimension } from "@/lib/data-table"
import type { BrowseFacets } from "@/models/experimental-report"
import { X } from "lucide-react"
import type { ReactNode } from "react"

export function clearedTableParams(filterKeys: readonly string[]) {
  return {
    q: null,
    sort: null,
    order: null,
    page: null,
    ...Object.fromEntries(filterKeys.map((key) => [key, null])),
  }
}

export function ResetFiltersButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button variant="secondary" size="sm" className="h-8 px-2 lg:px-3" onClick={onClick} disabled={disabled}>
      <X className="size-4" />
      Reset
    </Button>
  )
}

interface FacetFilterToolbarProps {
  children: ReactNode
  onReset: () => void
  isActive: boolean
  dimensions: FilterDimension[]
  facets: BrowseFacets
  selected: (key: string) => string[]
  onFilterChange: (key: string, value: string[]) => void
}

export function FacetFilterToolbar({
  children,
  onReset,
  isActive,
  dimensions,
  facets,
  selected,
  onFilterChange,
}: FacetFilterToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <ResetFiltersButton onClick={onReset} disabled={!isActive} />
      </div>
      {dimensions.length > 0 && (
        <BalancedGrid>
          {dimensions.map((dimension) => (
            <DataTableFacetedFilter
              key={dimension.key}
              className="w-full justify-start overflow-hidden"
              title={dimension.title}
              options={facets[dimension.key] ?? []}
              value={selected(dimension.key)}
              onChange={(value) => onFilterChange(dimension.key, value)}
            />
          ))}
        </BalancedGrid>
      )}
    </div>
  )
}
