"use client"

import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FIXATION_LABELS, METHOD_LABELS, SPECIES_LABELS } from "@/lib/constants"
import { browseMarkerParsers, isBrowseParamsActive } from "@/lib/data-table"
import { X } from "lucide-react"
import { useQueryStates } from "nuqs"
import { useEffect, useRef, useState } from "react"

const SPECIES_OPTIONS = Object.entries(SPECIES_LABELS).map(([value, label]) => ({ value, label }))
const METHOD_OPTIONS = Object.entries(METHOD_LABELS).map(([value, label]) => ({ value, label }))
const FIXATION_OPTIONS = Object.entries(FIXATION_LABELS).map(([value, label]) => ({ value, label }))

const SEARCH_DEBOUNCE_MS = 300

export function MarkerTableToolbar() {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search markers, cell types, tissues…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-8 w-[180px] lg:w-[280px]"
      />
      <DataTableFacetedFilter
        title="Species"
        options={SPECIES_OPTIONS}
        value={params.species}
        onChange={(value) => setParams({ species: value.length ? value : null, page: 1 })}
      />
      <DataTableFacetedFilter
        title="Method"
        options={METHOD_OPTIONS}
        value={params.method}
        onChange={(value) => setParams({ method: value.length ? value : null, page: 1 })}
      />
      <DataTableFacetedFilter
        title="Fixation"
        options={FIXATION_OPTIONS}
        value={params.fixation}
        onChange={(value) => setParams({ fixation: value.length ? value : null, page: 1 })}
      />
      {isActive && (
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2 lg:px-3"
          onClick={() =>
            setParams({ q: null, species: null, method: null, fixation: null, sort: null, order: null, page: null })
          }
        >
          <X className="h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  )
}
