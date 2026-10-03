"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CollisionPriority } from "@dnd-kit/abstract"
import { useDroppable } from "@dnd-kit/react"
import { Check, ChevronDown, ChevronRight, MessageSquare, Pencil, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AddMarkerForm } from "./add-marker-form"
import { SortableMarkerCard } from "./sortable-marker-card"
import { PanelCycle } from "./types"

interface CycleSectionProps {
  cycle: PanelCycle
  panelId: string
  species?: { id: string; label: string } | null
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
    <div className="relative border-l-2 border-border pb-6 pl-4 last:border-l-0 last:pb-0">
      <div className="absolute left-[-9px] top-0 size-4 rounded-full border-2 border-background bg-border" />
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cycle.name}</h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (!showNotes && !savedNotes) {
                enterEditMode()
              } else {
                setShowNotes(!showNotes)
              }
            }}
          >
            <MessageSquare className="size-3" />
            <span className="sr-only">Cycle notes</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Add Marker
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:bg-transparent hover:text-destructive"
            onClick={() => onRemoveCycle?.(cycle.id)}
          >
            <Trash2 className="size-3" />
            <span className="sr-only">Remove Cycle</span>
          </Button>
        </div>
      </div>

      {showNotes && (
        <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                placeholder="Add notes for this cycle…"
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNotes()
                  if (e.key === "Escape") {
                    e.preventDefault()
                    cancelEdit()
                  }
                }}
                className="h-8 text-sm"
                disabled={isSaving}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-primary"
                onClick={saveNotes}
                disabled={isSaving}
              >
                <Check className="size-4" />
                <span className="sr-only">Save notes</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={cancelEdit}
                disabled={isSaving}
              >
                <X className="size-4" />
                <span className="sr-only">Cancel editing notes</span>
              </Button>
            </div>
          ) : savedNotes ? (
            <div className="flex items-center gap-1.5">
              <span className="flex-1 text-sm text-muted-foreground">{savedNotes}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground/60 hover:text-foreground"
                onClick={enterEditMode}
              >
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit notes</span>
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {showAddForm && (
        <div className="mb-3 rounded-lg border bg-background p-3">
          <AddMarkerForm
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
