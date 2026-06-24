"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Layers, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { FIXATION_LABELS, type Panel } from "./types"

function markerCount(panel: Panel): number {
  return panel.cycles.reduce((sum, cycle) => sum + cycle.markers.length, 0)
}

export function PublicPanelsList() {
  const [panels, setPanels] = useState<Panel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const fetchPanels = async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/panels/public?limit=100")
        if (!res.ok) {
          toast.error("Failed to load public panels")
          return
        }
        const json = await res.json()
        setPanels(json.panels ?? json.data?.panels ?? [])
      } catch {
        toast.error("Failed to load public panels")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPanels()
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return panels
    const lower = query.toLowerCase()
    return panels.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.description ?? "").toLowerCase().includes(lower) ||
        (p.owner?.name ?? "").toLowerCase().includes(lower),
    )
  }, [panels, query])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search panels..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {panels.length === 0 ? "No public panels yet." : "No panels match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((panel) => {
            const speciesLabel = panel.species?.label ?? null
            const fixationLabel = panel.fixation
              ? (FIXATION_LABELS[panel.fixation as keyof typeof FIXATION_LABELS] ?? panel.fixation)
              : null
            const markers = markerCount(panel)
            const cycles = panel.cycles.length

            return (
              <Link key={panel.id} href={`/panel/${panel.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{panel.name}</CardTitle>
                    {panel.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{panel.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {speciesLabel && <Badge variant="outline">{speciesLabel}</Badge>}
                      {fixationLabel && <Badge variant="secondary">{fixationLabel}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {cycles} {cycles === 1 ? "cycle" : "cycles"}
                      </span>
                      <span>
                        {markers} {markers === 1 ? "marker" : "markers"}
                      </span>
                    </div>
                    {panel.owner?.name && <p className="text-xs text-muted-foreground">By {panel.owner.name}</p>}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
