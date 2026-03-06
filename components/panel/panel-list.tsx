"use client"

import { Button } from "@/components/ui/button"
import { move } from "@dnd-kit/helpers"
import { DragDropProvider } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { CycleSection } from "./cycle-section"
import type { PanelMarker, Species } from "./types"
import { PanelCycle } from "./types"

interface PanelListProps {
  panelId: number
  cycles: PanelCycle[]
  species?: Species | null
  onCyclesChange: (cycles: PanelCycle[]) => void
}

function cyclesToRecord(cycles: PanelCycle[]): Record<string, number[]> {
  const record: Record<string, number[]> = {}
  for (const cycle of cycles) {
    record[`cycle-${cycle.id}`] = cycle.markers.map((m) => m.id)
  }
  return record
}

function applyRecord(cycles: PanelCycle[], record: Record<string, number[]>): PanelCycle[] {
  const allMarkers = new Map<number, PanelMarker>()
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

   
  const handleDragOver = (event: any) => {
    const { source } = event.operation
    if (source?.type === "column") return

    setItems((currentItems) => {
      const next = move(currentItems, event)
      itemsRef.current = next
      return next
    })
  }

   
  const handleDragEnd = async (event: any) => {
    if (event.canceled) {
      syncFromProps(previousCycles.current)
      onCyclesChange(previousCycles.current)
      return
    }

    const finalCycles = applyRecord(cycles, itemsRef.current)
    onCyclesChange(finalCycles)

    const apiItems: { markerId: number; cycleId: number; sortOrder: number }[] = []
    for (const cycle of finalCycles) {
      cycle.markers.forEach((marker, idx) => {
        apiItems.push({ markerId: marker.id, cycleId: cycle.id, sortOrder: idx })
      })
    }

    if (apiItems.length === 0) return

    try {
      const res = await fetch(`/api/panels/${panelId}/markers/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: apiItems }),
      })
      if (!res.ok) {
        onCyclesChange(previousCycles.current)
        syncFromProps(previousCycles.current)
        toast.error("Failed to reorder markers")
      } else {
        previousCycles.current = finalCycles
        await handleMarkerAdded()
      }
    } catch {
      onCyclesChange(previousCycles.current)
      syncFromProps(previousCycles.current)
      toast.error("Failed to reorder markers")
    }
  }

  const handleRemoveMarker = async (cycleId: number, markerId: number) => {
    const res = await fetch(`/api/panels/${panelId}/markers`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markerId }),
    })

    if (!res.ok) {
      toast.error("Failed to remove marker")
      return
    }

    const newCycles = cycles.map((cycle) => {
      if (cycle.id === cycleId) {
        return { ...cycle, markers: cycle.markers.filter((m) => m.id !== markerId) }
      }
      return cycle
    })
    onCyclesChange(newCycles)
  }

  const handleAddCycle = async () => {
    setIsAddingCycle(true)
    const nextSortOrder = cycles.length

    const res = await fetch(`/api/panels/${panelId}/cycles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Cycle ${cycles.length + 1}`, sortOrder: nextSortOrder }),
    })

    setIsAddingCycle(false)

    if (!res.ok) {
      toast.error("Failed to add cycle")
      return
    }

    const json = await res.json()
    onCyclesChange([...cycles, json.data?.cycle ?? json.cycle])
  }

  const handleRemoveCycle = async (cycleId: number) => {
    const res = await fetch(`/api/panels/${panelId}/cycles/${cycleId}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      toast.error("Failed to remove cycle")
      return
    }

    onCyclesChange(cycles.filter((cycle) => cycle.id !== cycleId))
  }

  const handleMarkerAdded = async () => {
    const res = await fetch(`/api/panels/${panelId}`)
    if (res.ok) {
      const json = await res.json()
      const updatedPanel = json.data?.panel ?? json.panel
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

        <div className="relative pl-4 border-l-2 border-transparent">
          <Button
            variant="secondary"
            className="w-full justify-start text-xs font-medium"
            onClick={handleAddCycle}
            disabled={isAddingCycle}
          >
            <Plus className="mr-2 h-3 w-3" />
            {isAddingCycle ? "Adding..." : "Add New Cycle"}
          </Button>
        </div>
      </div>
    </DragDropProvider>
  )
}
