"use client"

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, FlaskConical, Info, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { PanelMarker } from "./types"

export type AntibodyResult = {
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

async function fetchAntibodies(params: URLSearchParams): Promise<AntibodyResult[] | null> {
  const res = await fetch(`/api/antibodies?${params}`)
  if (!res.ok) return null
  const json = await res.json()
  return json.antibodies ?? []
}

// Opening the picker on a marker with a protein preloads that target's antibodies; typing two or more
// characters switches to a debounced free-text search.
function useAntibodySearch({
  open,
  query,
  proteinId,
  species,
}: {
  open: boolean
  query: string
  proteinId: string | null
  species?: { id: string; label: string } | null
}) {
  const [results, setResults] = useState<AntibodyResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [autoLoaded, setAutoLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setAutoLoaded(false)
      return
    }

    if (proteinId && !autoLoaded && query.trim().length === 0) {
      setAutoLoaded(true)
      setIsSearching(true)
      fetchAntibodies(new URLSearchParams({ proteinId, limit: "10" }))
        .then((antibodies) => setResults(antibodies ?? []))
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false))
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      if (autoLoaded) return
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "8" })
        if (species) params.set("species", species.label)
        const antibodies = await fetchAntibodies(params)
        if (antibodies) setResults(antibodies)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, species, proteinId, autoLoaded])

  return { results, isSearching, autoLoaded }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1">
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      {children}
    </div>
  )
}

function DetailValue({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px]">{children}</span>
}

function AntibodyDetailsHoverCard({ antibody: ab }: { antibody: AntibodyResult }) {
  return (
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
            <DetailRow label="RRID">
              <a
                href={`https://scicrunch.org/resolver/${ab.rrid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {ab.rrid}
              </a>
            </DetailRow>
          )}
          {(ab.vendorName || ab.catalogNumber) && (
            <DetailRow label="Vendor">
              <DetailValue>{[ab.vendorName, ab.catalogNumber].filter(Boolean).join(" #")}</DetailValue>
            </DetailRow>
          )}
          {(ab.cloneId || ab.clonality) && (
            <DetailRow label="Clone">
              <DetailValue>{[ab.cloneId, ab.clonality].filter(Boolean).join(", ")}</DetailValue>
            </DetailRow>
          )}
          {ab.hostTaxon && (
            <DetailRow label="Host">
              <DetailValue>{ab.hostTaxon.label}</DetailValue>
            </DetailRow>
          )}
          {ab.targetSpecies.length > 0 && (
            <DetailRow label="Targets">
              <DetailValue>{ab.targetSpecies.join(", ")}</DetailValue>
            </DetailRow>
          )}
          {ab.applications.length > 0 && (
            <DetailRow label="Apps">
              <DetailValue>{ab.applications.join(", ")}</DetailValue>
            </DetailRow>
          )}
          {ab.conjugate && (
            <DetailRow label="Conjugate">
              <DetailValue>{ab.conjugate}</DetailValue>
            </DetailRow>
          )}
          {ab.citationCount > 0 && (
            <DetailRow label="Citations">
              <DetailValue>{ab.citationCount}</DetailValue>
            </DetailRow>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function emptyMessage(query: string, autoLoaded: boolean): string {
  if (query.trim().length >= 2) return "No antibodies found."
  if (autoLoaded) return "No antibodies found for this target. Try searching manually."
  return "Type to search antibodies."
}

interface AntibodyPickerProps {
  marker: PanelMarker
  geneName: string
  species?: { id: string; label: string } | null
  pending: boolean
  onSelect: (antibody: AntibodyResult) => void
}

export function AntibodyPicker({ marker, geneName, species, pending, onSelect }: AntibodyPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { results, isSearching, autoLoaded } = useAntibodySearch({
    open,
    query,
    proteinId: marker.proteinId,
    species,
  })
  const antibodyName = marker.antibody?.name ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-[200px] items-center gap-1 text-xs font-medium transition-colors",
            antibodyName ? "text-muted-foreground hover:text-foreground" : "text-primary hover:text-primary/80",
          )}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          ) : (
            <FlaskConical className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">
            {antibodyName ?? "Choose antibody"}
            {antibodyName && marker.antibody?.cloneId ? `, ${marker.antibody.cloneId}` : ""}
          </span>
          <ChevronsUpDown className="h-2.5 w-2.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={marker.protein ? `Search antibodies for ${geneName}…` : "Search antibodies…"}
            value={query}
            onValueChange={setQuery}
          />
          {autoLoaded && query.trim().length === 0 && (
            <p className="border-b px-3 py-1 text-xs text-muted-foreground">
              Showing antibodies for this target. Type to search by name, clone, or RRID.
            </p>
          )}
          <CommandList>
            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isSearching && results.length === 0 && <CommandEmpty>{emptyMessage(query, autoLoaded)}</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((ab) => (
                  <CommandItem
                    key={ab.id}
                    value={String(ab.id)}
                    onSelect={() => {
                      setOpen(false)
                      onSelect(ab)
                    }}
                    className="flex items-center gap-1"
                  >
                    <Check
                      className={cn("mr-2 h-3 w-3 shrink-0", marker.antibodyId === ab.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium truncate">{ab.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {[ab.vendorName, ab.cloneId ? `Clone: ${ab.cloneId}` : null, ab.rrid]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                    <AntibodyDetailsHoverCard antibody={ab} />
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
