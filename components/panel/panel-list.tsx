"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CycleSection } from "./cycle-section"
import type { Species } from "./types"
import { PanelCycle } from "./types"

interface PanelListProps {
  panelId: number
  cycles: PanelCycle[]
  species?: Species | null
  onCyclesChange: (cycles: PanelCycle[]) => void
}

export function PanelList({ panelId, cycles, species, onCyclesChange }: PanelListProps) {
  const [isAddingCycle, setIsAddingCycle] = useState(false)

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

    onCyclesChange(
      cycles.map((cycle) => {
        if (cycle.id === cycleId) {
          return { ...cycle, markers: cycle.markers.filter((m) => m.id !== markerId) }
        }
        return cycle
      }),
    )
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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
      {cycles.map((cycle) => (
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
  )
}
