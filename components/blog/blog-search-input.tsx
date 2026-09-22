"use client"

import { DebouncedSearchInput } from "@/components/data-table/search-input"
import { Search } from "lucide-react"
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"

export default function BlogSearchInput() {
  const [params, setParams] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
    },
    { shallow: false },
  )

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <DebouncedSearchInput
        placeholder="Search blog posts…"
        aria-label="Search blog posts"
        className="pl-10"
        debounceMs={500}
        value={params.search}
        onCommit={(search) => setParams({ search: search || null, page: null })}
      />
    </div>
  )
}
