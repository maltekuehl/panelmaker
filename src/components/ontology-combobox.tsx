"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedSearch } from "@/hooks/use-debounced-search"
import type { OntologyResult, OntologyType } from "@/lib/ontology"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"

export type { OntologyType }

export type OntologyValue = Pick<OntologyResult, "id" | "label">

interface OntologyComboboxProps {
  id?: string
  ontologyType: OntologyType
  value?: OntologyValue | null
  onChange: (value: OntologyValue | null) => void
  placeholder?: string
  disabled?: boolean
}

export function OntologyCombobox({
  id,
  ontologyType,
  value,
  onChange,
  placeholder = "Search\u2026",
  disabled = false,
}: OntologyComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const fetcher = useCallback(
    (q: string, signal: AbortSignal) =>
      fetch(`/api/ontology?type=${ontologyType}&q=${encodeURIComponent(q)}`, { signal }),
    [ontologyType],
  )
  const extractResults = useCallback((data: unknown) => (data as { results?: OntologyResult[] }).results ?? [], [])

  const { results, isLoading } = useDebouncedSearch<OntologyResult>({
    query,
    enabled: open,
    fetcher,
    extractResults,
  })

  function handleSelect(result: OntologyResult) {
    onChange({ id: result.id, label: result.label })
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className={cn(!value && "text-muted-foreground")}>{value ? value.label : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label={placeholder} className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!isLoading && query.trim().length < 2 && (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Check
                        className={cn("h-4 w-4 shrink-0", value?.id === result.id ? "opacity-100" : "opacity-0")}
                      />
                      <span className="font-medium">{result.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{result.id}</span>
                    </div>
                    {result.description && (
                      <span className="pl-6 text-xs text-muted-foreground line-clamp-1">{result.description}</span>
                    )}
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
