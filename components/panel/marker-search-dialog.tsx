"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type SearchResult = {
  type: "protein" | "antibody"
  proteinId?: string
  proteinLabel?: string
  geneSymbol?: string
  ensemblGeneId?: string
  antibodyId?: string
  antibodyName?: string
  rrid?: string
  vendorName?: string
  conjugate?: string
}

interface MarkerSearchDialogProps {
  panelId: string
  cycleId: string
  species?: { id: string; label: string } | null
  onMarkerAdded: () => void
}

export function MarkerSearchDialog({ panelId, cycleId, species, onMarkerAdded }: MarkerSearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [fluorophore, setFluorophore] = useState("")
  const [metalTag, setMetalTag] = useState("")
  const [isAdding, setIsAdding] = useState(false)
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
        const organismIdMatch = species ? /txid(\d+)/.exec(species.id) : null
        const proteinParams = new URLSearchParams({ q: query.trim(), limit: "5" })
        if (organismIdMatch) proteinParams.set("organismId", organismIdMatch[1])

        const antibodyParams = new URLSearchParams({ q: query.trim(), limit: "5" })
        if (species) antibodyParams.set("species", species.label)

        const [proteinsRes, antibodiesRes] = await Promise.all([
          fetch(`/api/proteins?${proteinParams}`),
          fetch(`/api/antibodies?${antibodyParams}`),
        ])

        const combined: SearchResult[] = []

        if (proteinsRes.ok) {
          const json = await proteinsRes.json()
          const proteins = json.proteins ?? []
          for (const p of proteins) {
            combined.push({
              type: "protein",
              proteinId: p.id,
              proteinLabel: p.label,
              geneSymbol: p.geneSymbol,
              ensemblGeneId: p.ensemblGeneId ?? undefined,
            })
          }
        }

        if (antibodiesRes.ok) {
          const json = await antibodiesRes.json()
          const antibodies = json.antibodies ?? []
          for (const ab of antibodies) {
            combined.push({
              type: "antibody",
              antibodyId: ab.id,
              antibodyName: ab.name,
              rrid: ab.rrid,
              vendorName: ab.vendorName,
              conjugate: ab.conjugate ?? undefined,
              proteinId: ab.targetProtein?.id,
              proteinLabel: ab.targetProtein?.label,
              geneSymbol: ab.targetProtein?.geneSymbol,
            })
          }
        }

        setResults(combined)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, species])

  const handleSelect = (result: SearchResult) => {
    setSelected(result)
    setOpen(false)
    setQuery("")
    if (result.type === "antibody" && result.conjugate) {
      setFluorophore(result.conjugate)
    }
  }

  const handleAdd = async () => {
    if (!selected) return
    setIsAdding(true)

    try {
      const res = await fetch(`/api/panels/${panelId}/markers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          proteinId: selected.proteinId || undefined,
          proteinLabel: selected.proteinLabel || undefined,
          geneSymbol: selected.geneSymbol || undefined,
          ensemblGeneId: selected.ensemblGeneId || undefined,
          antibodyId: selected.antibodyId || undefined,
          fluorophore: fluorophore || undefined,
          metalTag: metalTag || undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Failed to add marker")
        return
      }

      toast.success("Marker added to cycle")
      onMarkerAdded()
      setSelected(null)
      setFluorophore("")
      setMetalTag("")
    } catch {
      toast.error("Failed to add marker")
    } finally {
      setIsAdding(false)
    }
  }

  const selectedLabel = selected
    ? selected.type === "antibody"
      ? `${selected.antibodyName}${selected.rrid ? ` (${selected.rrid})` : ""}`
      : `${selected.proteinLabel}${selected.geneSymbol ? ` (${selected.geneSymbol})` : ""}`
    : null

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Marker</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal mt-1 h-9 text-sm"
            >
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selectedLabel ?? "Search proteins or antibodies..."}
              </span>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Type to search..." value={query} onValueChange={setQuery} />
              <CommandList>
                {isSearching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isSearching && query.trim().length >= 2 && results.length === 0 && (
                  <CommandEmpty>No results found.</CommandEmpty>
                )}
                {!isSearching && query.trim().length < 2 && (
                  <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
                )}
                {results.filter((r) => r.type === "protein").length > 0 && (
                  <CommandGroup heading="Proteins">
                    {results
                      .filter((r) => r.type === "protein")
                      .map((result) => (
                        <CommandItem
                          key={`p-${result.proteinId}`}
                          value={`protein-${result.proteinId}`}
                          onSelect={() => handleSelect(result)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selected?.proteinId === result.proteinId && selected?.type === "protein"
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{result.proteinLabel}</span>
                            {result.geneSymbol && (
                              <span className="text-xs text-muted-foreground">{result.geneSymbol}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
                {results.filter((r) => r.type === "antibody").length > 0 && (
                  <CommandGroup heading="Antibodies">
                    {results
                      .filter((r) => r.type === "antibody")
                      .map((result) => (
                        <CommandItem
                          key={`ab-${result.antibodyId}`}
                          value={`antibody-${result.antibodyId}`}
                          onSelect={() => handleSelect(result)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selected?.antibodyId === result.antibodyId && selected?.type === "antibody"
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {result.antibodyName}
                              {result.rrid && (
                                <span className="ml-1 text-xs text-muted-foreground">({result.rrid})</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {result.vendorName ?? "Unknown vendor"}
                              {result.proteinLabel && ` \u2192 ${result.proteinLabel}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fluorophore</Label>
          <Input
            placeholder="e.g., AF488"
            value={fluorophore}
            onChange={(e) => setFluorophore(e.target.value)}
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Metal Tag</Label>
          <Input
            placeholder="e.g., 142Nd"
            value={metalTag}
            onChange={(e) => setMetalTag(e.target.value)}
            className="mt-1 h-9 text-sm"
          />
        </div>
      </div>

      <Button onClick={handleAdd} disabled={isAdding || !selected} size="sm" className="w-full">
        {isAdding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
        Add to Cycle
      </Button>
    </div>
  )
}
