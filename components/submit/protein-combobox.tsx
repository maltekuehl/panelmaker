"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ProteinValue } from "./types"

export function ProteinCombobox({
  value,
  onChange,
  organismId,
  disabled,
  className,
}: {
  value?: ProteinValue | null
  onChange: (value: ProteinValue | null) => void
  organismId?: number
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProteinValue[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "10" })
        if (organismId) params.set("organismId", String(organismId))
        const res = await fetch(`/api/proteins?${params}`)
        if (res.ok) {
          const data = await res.json()
          setResults(
            (data.proteins ?? []).map((p: { id: string; label: string; geneSymbol: string | null }) => ({
              id: p.id,
              label: p.label,
              geneSymbol: p.geneSymbol,
            })),
          )
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, organismId])

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? `${value.label}${value.geneSymbol ? ` (${value.geneSymbol})` : ""}` : "Search UniProt proteins..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type to search (e.g. CD3, Ki67)..." value={query} onValueChange={setQuery} />
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
                        <span className="text-xs text-muted-foreground">
                          {protein.geneSymbol} · {protein.id}
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
