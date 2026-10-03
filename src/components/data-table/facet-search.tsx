"use client"

import { CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

const SEARCH_DEBOUNCE_MS = 300
const MIN_SUGGESTION_LENGTH = 2
const SUGGESTIONS_PER_FACET = 5

export type SearchableFacet = {
  key: string
  title: string
  options: { value: string; label: string; description?: string }[]
  selected: string[]
}

type FacetSearchProps = {
  value: string
  onCommit: (value: string) => void
  onSelectFacet: (key: string, value: string) => void
  facets: SearchableFacet[]
  placeholder: string
  className?: string
}

function matches(option: SearchableFacet["options"][number], needle: string): boolean {
  return option.label.toLowerCase().includes(needle) || (option.description?.toLowerCase().includes(needle) ?? false)
}

export function FacetSearch({ value, onCommit, onSelectFacet, facets, placeholder, className }: FacetSearchProps) {
  const [search, setSearch] = useState(value)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const suggestions = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (needle.length < MIN_SUGGESTION_LENGTH) return []
    return facets
      .map((facet) => ({
        ...facet,
        options: facet.options
          .filter((option) => !facet.selected.includes(option.value) && matches(option, needle))
          .slice(0, SUGGESTIONS_PER_FACET),
      }))
      .filter((facet) => facet.options.length > 0)
  }, [facets, search])

  const onChange = (next: string) => {
    setSearch(next)
    setOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommit(next), SEARCH_DEBOUNCE_MS)
  }

  const commitText = () => {
    clearTimeout(debounceRef.current)
    onCommit(search)
    setOpen(false)
  }

  const selectFacet = (key: string, optionValue: string) => {
    clearTimeout(debounceRef.current)
    setSearch("")
    setOpen(false)
    onSelectFacet(key, optionValue)
  }

  const trimmed = search.trim()

  return (
    <CommandPrimitive shouldFilter={false} loop className={cn("relative", className)}>
      <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex h-8 w-full items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              value={search}
              onValueChange={onChange}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false)
              }}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-full w-full min-w-0 bg-transparent outline-hidden placeholder:text-muted-foreground"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-[320px] p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
        >
          <CommandList>
            <CommandGroup>
              <CommandItem value="__text__" onSelect={commitText} className="[&>svg:last-child]:hidden">
                <Search className="text-muted-foreground" />
                <span className="truncate">Search names and identifiers for &quot;{trimmed}&quot;</span>
              </CommandItem>
            </CommandGroup>
            {suggestions.map((facet) => (
              <CommandGroup key={facet.key} heading={`Filter by ${facet.title.toLowerCase()}`}>
                {facet.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${facet.key}:${option.value}`}
                    onSelect={() => selectFacet(facet.key, option.value)}
                    className="gap-0 [&>svg:last-child]:hidden"
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.description && option.description !== option.label && (
                      <span className="shrink-0 pl-3 font-mono text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </PopoverContent>
      </Popover>
    </CommandPrimitive>
  )
}
