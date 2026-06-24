"use client"

import { FluorophoreCombobox, type FluorophoreOption } from "@/components/fluorophore-combobox"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, FlaskConical, GripVertical, Info, Loader2, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { PanelMarker } from "./types"

type AntibodyResult = {
  id: string
  name: string
  rrid: string | null
  vendorName: string | null
  catalogNumber: string | null
  cloneId: string | null
  conjugate: string | null
  hostTaxon: { id: string; label: string } | null
  targetSpecies: string[]
  applications: string[]
  vendorUrl: string | null
  clonality: string | null
  citationCount: number
}

interface MarkerCardProps {
  marker: PanelMarker
  panelId: string
  species?: { id: string; label: string } | null
  onRemove?: (id: string) => void
  onMarkerUpdated?: () => void
  isDragging?: boolean
}

export function MarkerCard({ marker, panelId, species, onRemove, onMarkerUpdated, isDragging }: MarkerCardProps) {
  const geneName = marker.protein?.geneSymbol ?? marker.protein?.label ?? "Unknown"
  const antibodyName = marker.antibody?.name ?? null
  const hostOrganism = marker.antibody?.hostTaxon?.label ?? null

  const [abOpen, setAbOpen] = useState(false)
  const [abQuery, setAbQuery] = useState("")
  const [abResults, setAbResults] = useState<AntibodyResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [autoLoaded, setAutoLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isUpdatingFlu, setIsUpdatingFlu] = useState(false)

  const handleSetFluorophore = async (value: FluorophoreOption | null) => {
    setIsUpdatingFlu(true)
    try {
      const res = await fetch(`/api/panels/${panelId}/markers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markerId: marker.id, fluorophoreId: value?.id ?? null }),
      })
      if (!res.ok) {
        toast.error("Failed to set fluorophore")
        return
      }
      onMarkerUpdated?.()
    } catch {
      toast.error("Failed to set fluorophore")
    } finally {
      setIsUpdatingFlu(false)
    }
  }

  useEffect(() => {
    if (!abOpen) {
      setAutoLoaded(false)
      return
    }

    if (marker.proteinId && !autoLoaded && abQuery.trim().length === 0) {
      setAutoLoaded(true)
      setIsSearching(true)
      const params = new URLSearchParams({ proteinId: marker.proteinId, limit: "10" })
      fetch(`/api/antibodies?${params}`)
        .then((res) => (res.ok ? res.json() : { antibodies: [] }))
        .then((json) => setAbResults(json.antibodies ?? []))
        .catch(() => setAbResults([]))
        .finally(() => setIsSearching(false))
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (abQuery.trim().length < 2) {
      if (autoLoaded) return
      setAbResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams({ q: abQuery.trim(), limit: "8" })
        if (species) params.set("species", species.label)
        const res = await fetch(`/api/antibodies?${params}`)
        if (res.ok) {
          const json = await res.json()
          setAbResults(json.antibodies ?? [])
        }
      } catch {
        setAbResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [abQuery, abOpen, species, marker.proteinId, autoLoaded])

  const handleSelectAntibody = async (ab: AntibodyResult) => {
    setIsUpdating(true)
    setAbOpen(false)
    try {
      const res = await fetch(`/api/panels/${panelId}/markers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markerId: marker.id,
          antibodyId: ab.id,
        }),
      })
      if (!res.ok) {
        toast.error("Failed to set antibody")
        return
      }
      onMarkerUpdated?.()
    } catch {
      toast.error("Failed to set antibody")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="group relative rounded-lg border bg-zinc-50 px-3 py-2.5 hover:border-zinc-300 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300 cursor-grab active:cursor-grabbing touch-none" />
          <div className="mt-1 h-3 w-3 rounded-full shadow-xs shrink-0 bg-primary/40" />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {marker.protein ? (
                <Link
                  href={`/marker/${marker.protein.id}`}
                  className="text-sm font-semibold leading-none hover:text-primary hover:underline underline-offset-2 transition-colors"
                >
                  {geneName}
                </Link>
              ) : (
                <p className="text-sm font-semibold leading-none">{geneName}</p>
              )}
              {marker.metalTag && !marker.fluorophore ? (
                <span className="text-[11px] text-muted-foreground leading-none">{marker.metalTag}</span>
              ) : (
                <FluorophoreCombobox
                  variant="inline"
                  value={marker.fluorophore}
                  onChange={handleSetFluorophore}
                  pending={isUpdatingFlu}
                />
              )}
              {hostOrganism && <span className="text-[11px] text-muted-foreground leading-none">{hostOrganism}</span>}
            </div>
            <Popover open={abOpen} onOpenChange={setAbOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium transition-colors max-w-[200px]",
                    antibodyName ? "text-zinc-500 hover:text-zinc-700" : "text-primary hover:text-primary/80",
                  )}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                  ) : (
                    <FlaskConical className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">
                    {antibodyName ?? "Choose antibody"}
                    {antibodyName && marker.antibody?.cloneId ? ` · ${marker.antibody.cloneId}` : ""}
                  </span>
                  <ChevronsUpDown className="h-2.5 w-2.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={marker.protein ? `Search antibodies for ${geneName}...` : "Search antibodies..."}
                    value={abQuery}
                    onValueChange={setAbQuery}
                  />
                  {autoLoaded && abQuery.trim().length === 0 && (
                    <p className="px-3 py-1 text-[10px] text-muted-foreground border-b">
                      Showing antibodies for this target. Type to search by name, clone, or RRID.
                    </p>
                  )}
                  <CommandList>
                    {isSearching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!isSearching && abResults.length === 0 && (
                      <CommandEmpty>
                        {abQuery.trim().length >= 2
                          ? "No antibodies found."
                          : autoLoaded
                            ? "No antibodies found for this target. Try searching manually."
                            : "Type to search antibodies."}
                      </CommandEmpty>
                    )}
                    {abResults.length > 0 && (
                      <CommandGroup>
                        {abResults.map((ab) => (
                          <CommandItem
                            key={ab.id}
                            value={String(ab.id)}
                            onSelect={() => handleSelectAntibody(ab)}
                            className="flex items-center gap-1"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3 shrink-0",
                                marker.antibodyId === ab.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-medium truncate">{ab.name}</span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {[ab.vendorName, ab.cloneId ? `Clone: ${ab.cloneId}` : null, ab.rrid]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </span>
                            </div>
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <button
                                  type="button"
                                  className="ml-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Info className="h-3 w-3" />
                                  <span className="sr-only">Antibody details</span>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64 p-3" side="right" align="start">
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold">{ab.name}</p>
                                  {ab.rrid && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">RRID:</span>
                                      <a
                                        href={`https://scicrunch.org/resolver/${ab.rrid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {ab.rrid}
                                      </a>
                                    </div>
                                  )}
                                  {(ab.vendorName || ab.catalogNumber) && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Vendor:</span>
                                      <span className="text-[10px]">
                                        {[ab.vendorName, ab.catalogNumber].filter(Boolean).join(" #")}
                                      </span>
                                    </div>
                                  )}
                                  {(ab.cloneId || ab.clonality) && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Clone:</span>
                                      <span className="text-[10px]">
                                        {[ab.cloneId, ab.clonality].filter(Boolean).join(" • ")}
                                      </span>
                                    </div>
                                  )}
                                  {ab.hostTaxon && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Host:</span>
                                      <span className="text-[10px]">{ab.hostTaxon.label}</span>
                                    </div>
                                  )}
                                  {ab.targetSpecies.length > 0 && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Targets:</span>
                                      <span className="text-[10px]">{ab.targetSpecies.join(", ")}</span>
                                    </div>
                                  )}
                                  {ab.applications.length > 0 && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Apps:</span>
                                      <span className="text-[10px]">{ab.applications.join(", ")}</span>
                                    </div>
                                  )}
                                  {ab.conjugate && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Conjugate:</span>
                                      <span className="text-[10px]">{ab.conjugate}</span>
                                    </div>
                                  )}
                                  {ab.citationCount > 0 && (
                                    <div className="flex gap-1">
                                      <span className="text-[10px] text-muted-foreground">Citations:</span>
                                      <span className="text-[10px]">{ab.citationCount}</span>
                                    </div>
                                  )}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-1 -mt-1 text-zinc-400 hover:text-red-500 hover:bg-transparent"
          onClick={() => onRemove?.(marker.id)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </div>
  )
}
