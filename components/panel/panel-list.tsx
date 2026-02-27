"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CycleSection } from "./cycle-section"
import { PanelCycle } from "./types"

// Dummy data for initial state
export const initialData: PanelCycle[] = [
  {
    id: "c1",
    name: "Cycle 1",
    markers: [
      {
        id: "m1",
        gene: "NPHS1",
        antibody: "Sigma HPA003266",
        cellType: "Podocyte",
        fluorophore: "AF488",
        host: "Rabbit",
        color: "bg-green-500",
      },
      {
        id: "m2",
        gene: "WT1",
        antibody: "Abcam ab89901",
        cellType: "Podocyte",
        fluorophore: "AF555",
        host: "Mouse",
        color: "bg-yellow-500",
      },
    ],
  },
  {
    id: "c2",
    name: "Cycle 2",
    markers: [
      {
        id: "m3",
        gene: "CD31",
        antibody: "Dako M0823",
        cellType: "Endothelial",
        fluorophore: "AF488",
        host: "Goat",
        color: "bg-green-500",
      },
    ],
  },
]

interface PanelListProps {
  cycles: PanelCycle[]
  onUpdate: (cycles: PanelCycle[]) => void
}

export function PanelList({ cycles, onUpdate }: PanelListProps) {
  const handleRemoveMarker = (cycleId: string, markerId: string) => {
    onUpdate(
      cycles.map((cycle) => {
        if (cycle.id === cycleId) {
          return {
            ...cycle,
            markers: cycle.markers.filter((m) => m.id !== markerId),
          }
        }
        return cycle
      }),
    )
  }

  const handleAddMarker = (cycleId: string) => {
    // Placeholder for adding logic
    console.log("Add marker to cycle", cycleId)
  }

  const handleAddCycle = () => {
    const newCycle: PanelCycle = {
      id: `c${cycles.length + 1}`,
      name: `Cycle ${cycles.length + 1}`,
      markers: [],
    }
    onUpdate([...cycles, newCycle])
  }

  const handleRemoveCycle = (cycleId: string) => {
    onUpdate(cycles.filter((cycle) => cycle.id !== cycleId))
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
      {cycles.map((cycle) => (
        <CycleSection
          key={cycle.id}
          cycle={cycle}
          onRemoveMarker={handleRemoveMarker}
          onAddMarker={handleAddMarker}
          onRemoveCycle={handleRemoveCycle}
        />
      ))}

      <div className="relative pl-4 border-l-2 border-transparent">
        <Button variant="secondary" className="w-full justify-start text-xs font-medium" onClick={handleAddCycle}>
          <Plus className="mr-2 h-3 w-3" />
          Add New Cycle
        </Button>
      </div>
    </div>
  )
}
