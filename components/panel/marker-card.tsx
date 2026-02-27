import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { PanelMarker } from "./types"

interface MarkerCardProps {
  marker: PanelMarker
  onRemove?: (id: string) => void
}

export function MarkerCard({ marker, onRemove }: MarkerCardProps) {
  return (
    <div className="group relative rounded-lg border bg-zinc-50 p-3 hover:border-zinc-300 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className={cn("mt-1 h-3 w-3 rounded-full shadow-sm shrink-0", marker.color)} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold leading-none">{marker.gene}</p>
              <span className="text-[10px] text-muted-foreground bg-white border px-1 rounded">{marker.cellType}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {marker.fluorophore} • {marker.host}
            </p>
            <p className="text-[10px] text-zinc-500 truncate max-w-[180px]">{marker.antibody}</p>
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
