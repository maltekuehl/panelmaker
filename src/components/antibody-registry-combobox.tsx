"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedSearch } from "@/hooks/use-debounced-search"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"

export interface AntibodyRegistryValue {
  name: string
  citation: string
  vendor: string
  catalogNumber: string
  clonality: string
  cloneId: string
  target: string
  sourceOrganism: string
  conjugate: string
  isotype: string
  targetSpecies: string[]
  applications: string[]
  url: string
}

interface AntibodyRegistryComboboxProps {
  id?: string
  value?: AntibodyRegistryValue | null
  onChange: (value: AntibodyRegistryValue | null) => void
  placeholder?: string
}

export function AntibodyRegistryCombobox({
  id,
  value,
  onChange,
  placeholder = "Search antibody by name, RRID, or target…",
}: AntibodyRegistryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const fetcher = useCallback(
    (q: string, signal: AbortSignal) => fetch(`/api/antibody-registry?q=${encodeURIComponent(q)}`, { signal }),
    [],
  )
  const extractResults = useCallback(
    (data: unknown) => (data as { results?: AntibodyRegistryValue[] }).results ?? [],
    [],
  )

  const { results, isLoading } = useDebouncedSearch<AntibodyRegistryValue>({
    query,
    enabled: open,
    fetcher,
    extractResults,
  })

  function handleSelect(result: AntibodyRegistryValue) {
    onChange(result)
    setOpen(false)
    setQuery("")
  }

  const displayLabel = value ? `${value.name}${value.citation ? ` (${value.citation})` : ""}` : null

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !displayLabel && "text-muted-foreground")}>
            {displayLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Antibody registry results"
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No antibodies found.</CommandEmpty>
            )}
            {!isLoading && query.trim().length < 2 && (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading="Antibody Registry">
                {results.map((result, idx) => (
                  <CommandItem
                    key={`${result.citation}-${idx}`}
                    value={`${result.citation}-${idx}`}
                    onSelect={() => handleSelect(result)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value?.citation === result.citation ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="font-medium truncate">{result.name}</span>
                      {result.citation && (
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">{result.citation}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 pl-6 text-xs text-muted-foreground">
                      {[result.vendor, result.catalogNumber, result.clonality, result.sourceOrganism]
                        .filter(Boolean)
                        .map((part) => (
                          <span key={part}>{part}</span>
                        ))}
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
