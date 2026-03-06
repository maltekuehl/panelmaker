"use client"

import { useSortable } from "@dnd-kit/react/sortable"
import { MarkerCard } from "./marker-card"
import type { PanelMarker, Species } from "./types"

interface SortableMarkerCardProps {
  marker: PanelMarker
  index: number
  column: string
  panelId: number
  species?: Species | null
  onRemove?: (id: number) => void
  onMarkerUpdated?: () => void
}

export function SortableMarkerCard({
  marker,
  index,
  column,
  panelId,
  species,
  onRemove,
  onMarkerUpdated,
}: SortableMarkerCardProps) {
  const { ref, isDragging } = useSortable({
    id: marker.id,
    index,
    type: "item",
    accept: "item",
    group: column,
  })

  return (
    <div ref={ref} data-dragging={isDragging || undefined} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <MarkerCard
        marker={marker}
        panelId={panelId}
        species={species}
        onRemove={onRemove}
        onMarkerUpdated={onMarkerUpdated}
        isDragging={isDragging}
      />
    </div>
  )
}
