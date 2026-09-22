"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedSearch } from "@/hooks/use-debounced-search"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"
import type { ProteinValue } from "./types"

export function ProteinCombobox({
  id,
  value,
  onChange,
  organismId,
  disabled,
  className,
}: {
  id?: string
  value?: ProteinValue | null
  onChange: (value: ProteinValue | null) => void
  organismId?: number
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const fetcher = useCallback(
    (q: string, signal: AbortSignal) => {
      const params = new URLSearchParams({ q, limit: "10" })
      if (organismId) params.set("organismId", String(organismId))
      return fetch(`/api/proteins?${params}`, { signal })
    },
    [organismId],
  )

  const extractResults = useCallback(
    (data: unknown) =>
      ((data as { proteins?: { id: string; label: string; geneSymbol: string | null }[] }).proteins ?? []).map((p) => ({
        id: p.id,
        label: p.label,
        geneSymbol: p.geneSymbol,
      })),
    [],
  )

  const { results, isLoading: isSearching } = useDebouncedSearch<ProteinValue>({
    query,
    enabled: open,
    fetcher,
    extractResults,
  })

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? `${value.label}${value.geneSymbol ? ` (${value.geneSymbol})` : ""}` : "Search UniProt proteins…"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search (e.g. CD3, Ki67)…" value={query} onValueChange={setQuery} />
          <CommandList>
            {isSearching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No proteins found.</CommandEmpty>
            )}
            {!isSearching && query.trim().length < 2 && <CommandEmpty>Type at least 2 characters.</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading="Proteins">
                {results.map((protein) => (
                  <CommandItem
                    key={protein.id}
                    value={protein.id}
                    onSelect={() => {
                      onChange(protein)
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4 shrink-0", value?.id === protein.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{protein.label}</span>
                      {protein.geneSymbol && (
                        <span className="flex gap-x-2 text-xs text-muted-foreground">
                          <span>{protein.geneSymbol}</span>
                          <span>{protein.id}</span>
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
