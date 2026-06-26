"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedSearch } from "@/hooks/use-debounced-search"
import { FlaskConical, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"

export interface LabInventoryImportItem {
  id: string
  labName: string
  rrid: string | null
  name: string
  vendorName: string | null
  catalogNumber: string | null
  cloneId: string | null
  targetName: string | null
  targetProtein: { id: string; label: string; geneSymbol: string | null } | null
  hostTaxon: { id: string; label: string } | null
}

export function LabInventoryCombobox({ onImport }: { onImport: (item: LabInventoryImportItem) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const fetcher = useCallback((q: string) => fetch(`/api/labs/inventory/mine?q=${encodeURIComponent(q)}`), [])
  const extractResults = useCallback((data: any) => data.items ?? [], [])

  const { results, isLoading } = useDebouncedSearch<LabInventoryImportItem>({
    query,
    enabled: open,
    minLength: 0,
    fetcher,
    extractResults,
  })

  function handleSelect(item: LabInventoryImportItem) {
    onImport(item)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8">
          <FlaskConical className="size-4" />
          Import from lab
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search your lab inventory..." value={query} onValueChange={setQuery} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && results.length === 0 && <CommandEmpty>No antibodies stocked in your labs.</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading="Lab inventory">
                {results.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="truncate font-medium">{item.name}</span>
                      {item.rrid && (
                        <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{item.rrid}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[item.labName, item.targetProtein?.geneSymbol ?? item.targetName, item.hostTaxon?.label]
                        .filter(Boolean)
                        .join(" · ")}
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
