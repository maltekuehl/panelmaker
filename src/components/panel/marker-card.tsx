"use client"

import { FluorophoreCombobox, type FluorophoreOption } from "@/components/fluorophore-combobox"
import { Button } from "@/components/ui/button"
import { markerHref } from "@/lib/routes"
import { GripVertical, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { AntibodyPicker, type AntibodyResult } from "./antibody-picker"
import { patchPanelMarker } from "./panel-api"
import type { PanelMarker } from "./types"

interface MarkerCardProps {
  marker: PanelMarker
  panelId: string
  species?: { id: string; label: string } | null
  onRemove?: (id: string) => void
  onMarkerUpdated?: () => void
  dragHandleRef?: (element: Element | null) => void
}

export function MarkerCard({ marker, panelId, species, onRemove, onMarkerUpdated, dragHandleRef }: MarkerCardProps) {
  const geneName = marker.protein?.geneSymbol ?? marker.protein?.label ?? "Unknown"
  const hostOrganism = marker.antibody?.hostTaxon?.label ?? null
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdatingFlu, setIsUpdatingFlu] = useState(false)

  const updateMarker = async (
    data: Record<string, unknown>,
    setPending: (pending: boolean) => void,
    errorMessage: string,
  ) => {
    setPending(true)
    try {
      const res = await patchPanelMarker(panelId, { markerId: marker.id, ...data })
      if (!res.ok) {
        toast.error(errorMessage)
        return
      }
      onMarkerUpdated?.()
    } catch {
      toast.error(errorMessage)
    } finally {
      setPending(false)
    }
  }

  const handleSetFluorophore = (value: FluorophoreOption | null) =>
    updateMarker({ fluorophoreId: value?.id ?? null }, setIsUpdatingFlu, "Failed to set fluorophore")

  const handleSelectAntibody = (ab: AntibodyResult) =>
    updateMarker({ antibodyId: ab.id }, setIsUpdating, "Failed to set antibody")

  return (
    <div className="group relative rounded-lg border bg-muted/40 px-3 py-2.5 transition-colors hover:border-foreground/20">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            ref={dragHandleRef}
            aria-label={`Reorder ${geneName}`}
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded-sm text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </span>
          <div className="mt-1 h-3 w-3 rounded-full shadow-xs shrink-0 bg-primary/40" />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {marker.protein ? (
                <Link
                  href={markerHref(marker.protein.id)}
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
            <AntibodyPicker
              marker={marker}
              geneName={geneName}
              species={species}
              pending={isUpdating}
              onSelect={handleSelectAntibody}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 size-6 text-muted-foreground hover:bg-transparent hover:text-destructive"
          onClick={() => onRemove?.(marker.id)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </div>
  )
}
