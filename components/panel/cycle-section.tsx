import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { MarkerCard } from "./marker-card"
import { PanelCycle } from "./types"

interface CycleSectionProps {
  cycle: PanelCycle
  onRemoveMarker?: (cycleId: string, markerId: string) => void
  onAddMarker?: (cycleId: string) => void
  onRemoveCycle?: (cycleId: string) => void
}

export function CycleSection({ cycle, onRemoveMarker, onAddMarker, onRemoveCycle }: CycleSectionProps) {
  return (
    <div className="relative pl-4 border-l-2 border-zinc-200 pb-6 last:border-l-0 last:pb-0">
      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-zinc-200 border-2 border-white" />
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{cycle.name}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-transparent"
          onClick={() => onRemoveCycle?.(cycle.id)}
        >
          <Trash2 className="h-3 w-3" />
          <span className="sr-only">Remove Cycle</span>
        </Button>
      </div>

      <div className="space-y-3">
        {cycle.markers.map((marker) => (
          <MarkerCard key={marker.id} marker={marker} onRemove={(markerId) => onRemoveMarker?.(cycle.id, markerId)} />
        ))}
      </div>

      {cycle.markers.length < 5 && (
        <Button
          variant="outline"
          className="mt-4 w-full border-dashed border-zinc-300 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 justify-start"
          onClick={() => onAddMarker?.(cycle.id)}
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Marker to {cycle.name.split(" ")[0]}
        </Button>
      )}
    </div>
  )
}
