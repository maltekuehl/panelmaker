"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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
  uniprotId: string
  targetSpecies: string[]
  applications: string[]
  url: string
}

interface AntibodyRegistryComboboxProps {
  value?: AntibodyRegistryValue | null
  onChange: (value: AntibodyRegistryValue | null) => void
  placeholder?: string
}

export function AntibodyRegistryCombobox({
  value,
  onChange,
  placeholder = "Search antibody by name, RRID, or target...",
}: AntibodyRegistryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AntibodyRegistryValue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/antibody-registry?q=${encodeURIComponent(query.trim())}`)
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, open])

  function handleSelect(result: AntibodyRegistryValue) {
    onChange(result)
    setOpen(false)
    setQuery("")
  }

  function handleClear() {
    onChange(null)
  }

  const displayLabel = value ? `${value.name}${value.citation ? ` (${value.citation})` : ""}` : null

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className={cn("truncate", !displayLabel && "text-muted-foreground")}>
              {displayLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                      <div className="pl-6 text-xs text-muted-foreground">
                        {[result.vendor, result.catalogNumber, result.clonality, result.sourceOrganism]
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

      {value && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{value.name}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleClear}>
              Clear
            </Button>
          </div>
          {value.citation && (
            <div className="text-muted-foreground">
              RRID: <span className="font-mono text-xs">{value.citation}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
            {value.vendor && (
              <div>
                Vendor: <span className="text-foreground">{value.vendor}</span>
              </div>
            )}
            {value.catalogNumber && (
              <div>
                Catalog #: <span className="text-foreground">{value.catalogNumber}</span>
              </div>
            )}
            {value.cloneId && (
              <div>
                Clone: <span className="text-foreground">{value.cloneId}</span>
              </div>
            )}
            {value.clonality && (
              <div>
                Clonality: <span className="text-foreground">{value.clonality}</span>
              </div>
            )}
            {value.target && (
              <div>
                Target: <span className="text-foreground">{value.target}</span>
              </div>
            )}
            {value.sourceOrganism && (
              <div>
                Host: <span className="text-foreground">{value.sourceOrganism}</span>
              </div>
            )}
            {value.conjugate && value.conjugate !== "Unconjugated" && (
              <div>
                Conjugate: <span className="text-foreground">{value.conjugate}</span>
              </div>
            )}
            {value.targetSpecies.length > 0 && (
              <div>
                Reactivity: <span className="text-foreground">{value.targetSpecies.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
