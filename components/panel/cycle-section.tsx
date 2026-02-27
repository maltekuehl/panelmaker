"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, MessageSquare, Trash2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { MarkerCard } from "./marker-card"
import { MarkerSearchDialog } from "./marker-search-dialog"
import type { Species } from "./types"
import { PanelCycle } from "./types"

interface CycleSectionProps {
  cycle: PanelCycle
  panelId: number
  species?: Species | null
  onRemoveMarker?: (cycleId: number, markerId: number) => void
  onRemoveCycle?: (cycleId: number) => void
  onMarkerAdded?: () => void
  onCycleUpdated?: () => void
}

export function CycleSection({
  cycle,
  panelId,
  species,
  onRemoveMarker,
  onRemoveCycle,
  onMarkerAdded,
  onCycleUpdated,
}: CycleSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showNotes, setShowNotes] = useState(!!cycle.notes)
  const [notes, setNotes] = useState(cycle.notes ?? "")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveNotes = (value: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSavingNotes(true)
      try {
        const res = await fetch(`/api/panels/${panelId}/cycles/${cycle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value || null }),
        })
        if (!res.ok) {
          toast.error("Failed to save notes")
        } else {
          onCycleUpdated?.()
        }
      } catch {
        toast.error("Failed to save notes")
      } finally {
        setIsSavingNotes(false)
      }
    }, 500)
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    saveNotes(value)
  }

  return (
    <div className="relative pl-4 border-l-2 border-zinc-200 pb-6 last:border-l-0 last:pb-0">
      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-zinc-200 border-2 border-white" />
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{cycle.name}</h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-600"
            onClick={() => setShowNotes(!showNotes)}
            title="Cycle notes"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Add Marker
          </Button>
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
      </div>

      {showNotes && (
        <div className="mb-3">
          <Input
            placeholder="Add notes for this cycle..."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="h-7 text-xs"
          />
          {isSavingNotes && <span className="text-[10px] text-muted-foreground">Saving...</span>}
        </div>
      )}

      {showAddForm && (
        <div className="mb-3 p-3 border rounded-lg bg-white">
          <MarkerSearchDialog
            panelId={panelId}
            cycleId={cycle.id}
            species={species}
            onMarkerAdded={() => {
              onMarkerAdded?.()
              setShowAddForm(false)
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        {cycle.markers.map((marker) => (
          <MarkerCard
            key={marker.id}
            marker={marker}
            panelId={panelId}
            species={species}
            onRemove={(markerId) => onRemoveMarker?.(cycle.id, markerId)}
            onMarkerUpdated={onMarkerAdded}
          />
        ))}
      </div>

      {cycle.markers.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground italic mt-2">No markers added yet.</p>
      )}
    </div>
  )
}
