"use client"

import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { Button } from "@/components/ui/button"
import { isLeaderboardParamsActive, LEADERBOARD_FILTER_KEYS, leaderboardParsers } from "@/lib/data-table"
import { X } from "lucide-react"
import { useQueryStates } from "nuqs"

export type LeaderboardFilterOption = { value: string; label: string; description?: string }

export type LeaderboardDimension = {
  key: string
  title: string
  options: LeaderboardFilterOption[]
}

// The whole filter state lives in the URL (shallow: false), so every view of the board is a shareable
// link. Behaviour and markup are the browse toolbar's: the same faceted multi-select, the same reset.
export function LeaderboardFilters({ dimensions }: { dimensions: LeaderboardDimension[] }) {
  const [params, setParams] = useQueryStates(leaderboardParsers, { shallow: false })

  const isActive = isLeaderboardParamsActive(params)
  const visibleDimensions = dimensions.filter((dimension) => dimension.options.length > 0)

  const resetFilters = () =>
    setParams(Object.fromEntries(LEADERBOARD_FILTER_KEYS.map((key) => [key, null])) as Parameters<typeof setParams>[0])

  if (visibleDimensions.length === 0 && !isActive) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleDimensions.map((dimension) => (
        <DataTableFacetedFilter
          key={dimension.key}
          className="w-[180px] justify-start overflow-hidden"
          title={dimension.title}
          options={dimension.options}
          value={params[dimension.key as keyof typeof params] ?? []}
          onChange={(value) =>
            setParams({ [dimension.key]: value.length ? value : null } as Parameters<typeof setParams>[0])
          }
        />
      ))}
      <Button variant="secondary" size="sm" className="h-8 px-2 lg:px-3" onClick={resetFilters} disabled={!isActive}>
        <X className="size-4" />
        Reset
      </Button>
    </div>
  )
}
