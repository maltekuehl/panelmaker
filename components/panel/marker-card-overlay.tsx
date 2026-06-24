"use client"

import type { PanelMarker } from "./types"

interface MarkerCardOverlayProps {
  marker: PanelMarker
}

export function MarkerCardOverlay({ marker }: MarkerCardOverlayProps) {
  const geneName = marker.protein?.geneSymbol ?? marker.protein?.label ?? "Unknown"
  const fluorophore = marker.fluorophore ?? marker.metalTag ?? null

  return (
    <div className="rounded-lg border border-primary/30 bg-white p-3 shadow-lg w-[280px]">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full shadow-xs shrink-0 bg-primary/40" />
        <div>
          <p className="text-sm font-semibold leading-none">{geneName}</p>
          {fluorophore && <p className="text-xs text-muted-foreground mt-1">{fluorophore}</p>}
        </div>
      </div>
    </div>
  )
}
