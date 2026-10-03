"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { move } from "@dnd-kit/helpers"
import { DragDropProvider, type DragDropEvents } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { CycleSection } from "./cycle-section"
import { panelUrl, sendJson } from "./panel-api"
import type { PanelCycle, PanelMarker } from "./types"

interface PanelListProps {
  panelId: string
  cycles: PanelCycle[]
  species?: { id: string; label: string } | null
  onCyclesChange: (cycles: PanelCycle[]) => void
}

function cyclesToRecord(cycles: PanelCycle[]): Record<string, string[]> {
  const record: Record<string, string[]> = {}
  for (const cycle of cycles) {
    record[`cycle-${cycle.id}`] = cycle.markers.map((m) => m.id)
  }
  return record
}

function applyRecord(cycles: PanelCycle[], record: Record<string, string[]>): PanelCycle[] {
  const allMarkers = new Map<string, PanelMarker>()
  for (const cycle of cycles) {
    for (const marker of cycle.markers) {
      allMarkers.set(marker.id, marker)
    }
  }

  return cycles.map((cycle) => {
    const key = `cycle-${cycle.id}`
    const markerIds = record[key] ?? []
    return {
      ...cycle,
      markers: markerIds
        .map((id) => allMarkers.get(id))
        .filter((m): m is PanelMarker => m !== undefined)
        .map((m) => ({ ...m, cycleId: cycle.id })),
    }
  })
}

export function PanelList({ panelId, cycles, species, onCyclesChange }: PanelListProps) {
  const [isAddingCycle, setIsAddingCycle] = useState(false)
  const [cycleToDelete, setCycleToDelete] = useState<PanelCycle | null>(null)
  const [isDeletingCycle, setIsDeletingCycle] = useState(false)
  const previousCycles = useRef(cycles)

  const [items, setItems] = useState(() => cyclesToRecord(cycles))
  const itemsRef = useRef(items)

  const syncFromProps = (newCycles: PanelCycle[]) => {
    const record = cyclesToRecord(newCycles)
    setItems(record)
    itemsRef.current = record
  }

  useEffect(() => {
    const currentRecord = cyclesToRecord(cycles)
    const prevRecord = cyclesToRecord(previousCycles.current)
    const recordChanged = JSON.stringify(currentRecord) !== JSON.stringify(prevRecord)
    if (recordChanged) {
      previousCycles.current = cycles
      syncFromProps(cycles)
    }
  }, [cycles])

  const handleDragOver: NonNullable<DragDropEvents["dragover"]> = (event) => {
    const { source } = event.operation
    if (source?.type === "column") return

    setItems((currentItems) => {
      const next = move(currentItems, event)
      itemsRef.current = next
      return next
    })
  }

  const handleDragEnd: NonNullable<DragDropEvents["dragend"]> = async (event) => {
    if (event.canceled) {
      syncFromProps(previousCycles.current)
      return
    }

    const finalCycles = applyRecord(cycles, itemsRef.current)
    onCyclesChange(finalCycles)

    const apiItems: { markerId: string; cycleId: string; sortOrder: number }[] = []
    for (const cycle of finalCycles) {
      cycle.markers.forEach((marker, idx) => {
        apiItems.push({ markerId: marker.id, cycleId: cycle.id, sortOrder: idx })
      })
    }

    if (apiItems.length === 0) return

    const revert = () => {
      onCyclesChange(previousCycles.current)
      syncFromProps(previousCycles.current)
      toast.error("Failed to reorder markers")
    }

    try {
      const res = await sendJson(`${panelUrl(panelId)}/markers/reorder`, "PUT", { items: apiItems })
      if (!res.ok) {
        revert()
      } else {
        previousCycles.current = finalCycles
      }
    } catch {
      revert()
    }
  }

  const handleRemoveMarker = async (cycleId: string, markerId: string) => {
    try {
      const res = await sendJson(`${panelUrl(panelId)}/markers`, "DELETE", { markerId })

      if (!res.ok) {
        toast.error("Failed to remove marker")
        return
      }

      onCyclesChange(
        cycles.map((cycle) =>
          cycle.id === cycleId ? { ...cycle, markers: cycle.markers.filter((m) => m.id !== markerId) } : cycle,
        ),
      )
    } catch {
      toast.error("Failed to remove marker")
    }
  }

  const handleAddCycle = async () => {
    setIsAddingCycle(true)
    const usedNumbers = cycles.map((cycle) => Number(/^Cycle (\d+)$/.exec(cycle.name)?.[1] ?? 0))
    const nextNumber = Math.max(cycles.length, ...usedNumbers) + 1
    const nextSortOrder = Math.max(-1, ...cycles.map((cycle) => cycle.sortOrder)) + 1

    try {
      const res = await sendJson(`${panelUrl(panelId)}/cycles`, "POST", {
        name: `Cycle ${nextNumber}`,
        sortOrder: nextSortOrder,
      })

      if (!res.ok) {
        toast.error("Failed to add cycle")
        return
      }

      const json = await res.json()
      onCyclesChange([...cycles, json.cycle])
    } catch {
      toast.error("Failed to add cycle")
    } finally {
      setIsAddingCycle(false)
    }
  }

  const deleteCycle = async (cycleId: string) => {
    setIsDeletingCycle(true)
    try {
      const res = await fetch(`${panelUrl(panelId)}/cycles/${cycleId}`, { method: "DELETE" })

      if (!res.ok) {
        toast.error("Failed to remove cycle")
        return
      }

      onCyclesChange(cycles.filter((cycle) => cycle.id !== cycleId))
    } catch {
      toast.error("Failed to remove cycle")
    } finally {
      setIsDeletingCycle(false)
      setCycleToDelete(null)
    }
  }

  const handleRemoveCycle = async (cycleId: string) => {
    const cycle = cycles.find((c) => c.id === cycleId)
    if (!cycle) return
    if (cycle.markers.length === 0) {
      await deleteCycle(cycleId)
      return
    }
    setCycleToDelete(cycle)
  }

  const handleMarkerAdded = async () => {
    const res = await fetch(panelUrl(panelId))
    if (res.ok) {
      const json = await res.json()
      const updatedPanel = json.panel
      if (updatedPanel?.cycles) {
        onCyclesChange(updatedPanel.cycles)
      }
    }
  }

  const displayCycles = applyRecord(cycles, items)

  return (
    <DragDropProvider
      onDragStart={() => {
        previousCycles.current = cycles
      }}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {displayCycles.map((cycle) => (
          <CycleSection
            key={cycle.id}
            cycle={cycle}
            panelId={panelId}
            species={species}
            onRemoveMarker={handleRemoveMarker}
            onRemoveCycle={handleRemoveCycle}
            onMarkerAdded={handleMarkerAdded}
            onCycleUpdated={handleMarkerAdded}
          />
        ))}

        {displayCycles.length === 0 && (
          <p className="pl-4 text-xs text-muted-foreground">Add a cycle to start placing markers.</p>
        )}

        <div className="relative border-l-2 border-transparent pl-4">
          <Button
            variant="secondary"
            className="w-full justify-start text-xs font-medium"
            onClick={handleAddCycle}
            disabled={isAddingCycle}
          >
            <Plus className="size-3" />
            {isAddingCycle ? "Adding…" : "Add new cycle"}
          </Button>
        </div>
      </div>

      <AlertDialog open={cycleToDelete !== null} onOpenChange={(open) => !open && setCycleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cycle</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{cycleToDelete?.name}&quot; and its {cycleToDelete?.markers.length}{" "}
              {cycleToDelete?.markers.length === 1 ? "marker" : "markers"} will be permanently deleted. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingCycle}
              onClick={(event) => {
                event.preventDefault()
                if (cycleToDelete) void deleteCycle(cycleToDelete.id)
              }}
            >
              Delete cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DragDropProvider>
  )
}
