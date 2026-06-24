"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useDroppable } from "@dnd-kit/react"
import { Check, ChevronDown, ChevronRight, MessageSquare, Pencil, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { MarkerSearchDialog } from "./marker-search-dialog"
import { SortableMarkerCard } from "./sortable-marker-card"
import type { Species } from "./types"
import { PanelCycle } from "./types"

interface CycleSectionProps {
  cycle: PanelCycle
  panelId: string
  species?: Species | null
  onRemoveMarker?: (cycleId: string, markerId: string) => void
  onRemoveCycle?: (cycleId: string) => void
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
  const { ref: droppableRef } = useDroppable({
    id: `cycle-${cycle.id}`,
    type: "column",
    accept: "item",
    collisionPriority: CollisionPriority.Low,
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [showNotes, setShowNotes] = useState(!!cycle.notes)
  const [savedNotes, setSavedNotes] = useState(cycle.notes ?? "")
  const [draftNotes, setDraftNotes] = useState(cycle.notes ?? "")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const enterEditMode = () => {
    setDraftNotes(savedNotes)
    setIsEditing(true)
    setShowNotes(true)
  }

  const cancelEdit = () => {
    setDraftNotes(savedNotes)
    setIsEditing(false)
  }

  const saveNotes = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/panels/${panelId}/cycles/${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draftNotes.trim() || null }),
      })
      if (!res.ok) {
        toast.error("Failed to save notes")
        return
      }
      setSavedNotes(draftNotes.trim())
      setIsEditing(false)
      if (!draftNotes.trim()) setShowNotes(false)
      onCycleUpdated?.()
    } catch {
      toast.error("Failed to save notes")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative pl-4 border-l-2 border-zinc-200 pb-6 last:border-l-0 last:pb-0">
      <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-zinc-200 border-2 border-white" />
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{cycle.name}</h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-600"
            onClick={() => {
              if (!showNotes && !savedNotes) {
                enterEditMode()
              } else {
                setShowNotes(!showNotes)
              }
            }}
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
        <div className="mb-3 rounded-lg bg-zinc-100 px-3 py-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                placeholder="Add notes for this cycle..."
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNotes()
                  if (e.key === "Escape") cancelEdit()
                }}
                className="h-8 text-sm bg-white"
                disabled={isSaving}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-zinc-500 hover:text-green-600"
                onClick={saveNotes}
                disabled={isSaving}
                title="Save notes"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-zinc-400 hover:text-zinc-600"
                onClick={cancelEdit}
                disabled={isSaving}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : savedNotes ? (
            <div className="flex items-center gap-1.5 group">
              <span className="text-sm text-zinc-600 flex-1">{savedNotes}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-zinc-300 hover:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={enterEditMode}
                title="Edit notes"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
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

      <div ref={droppableRef} className="space-y-3 min-h-[40px]">
        {cycle.markers.map((marker, index) => (
          <SortableMarkerCard
            key={marker.id}
            marker={marker}
            index={index}
            column={`cycle-${cycle.id}`}
            panelId={panelId}
            species={species}
            onRemove={(markerId) => onRemoveMarker?.(cycle.id, markerId)}
            onMarkerUpdated={onMarkerAdded}
          />
        ))}
        {cycle.markers.length === 0 && !showAddForm && (
          <p className="text-xs text-muted-foreground italic mt-2">No markers added yet.</p>
        )}
      </div>
    </div>
  )
}
