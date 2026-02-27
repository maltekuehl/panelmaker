"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Palette, Plus } from "lucide-react"
import { useState } from "react"
import { PanelForm } from "./panel-form"
import { PanelList, initialData } from "./panel-list"
import { Panel, PanelCycle } from "./types"

const initialPanels: Panel[] = [
  {
    id: "p1",
    name: "Kidney Panel",
    description: "Standard kidney panel for podocyte identification",
    species: "Homo sapiens",
    type: "FFPE",
    condition: "Healthy Kidney",
    cycles: initialData,
  },
  {
    id: "p2",
    name: "Liver Panel",
    description: "Liver panel for Kupffer cells",
    species: "Mus musculus",
    type: "FF",
    condition: "Liver Fibrosis",
    cycles: [],
  },
]

export function PanelWorkspace() {
  const [panels, setPanels] = useState<Panel[]>(initialPanels)
  const [activePanelId, setActivePanelId] = useState<string>("p1")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const activePanel = panels.find((p) => p.id === activePanelId) || panels[0]

  const handleUpdateCycles = (newCycles: PanelCycle[]) => {
    setPanels(
      panels.map((p) => {
        if (p.id === activePanelId) {
          return { ...p, cycles: newCycles }
        }
        return p
      }),
    )
  }

  const handleCreatePanel = (data: Omit<Panel, "id" | "cycles">) => {
    const newPanel: Panel = {
      ...data,
      id: `p${Date.now()}`,
      cycles: [],
    }
    setPanels([...panels, newPanel])
    setActivePanelId(newPanel.id)
    setIsCreateOpen(false)
  }

  return (
    <Card className="flex flex-col h-[600px] p-0 overflow-hidden">
      <div className="p-4 pb-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <Select value={activePanelId} onValueChange={setActivePanelId}>
            <SelectTrigger className="h-10 flex-1 font-medium">
              <SelectValue placeholder="Select panel" />
            </SelectTrigger>
            <SelectContent>
              {panels.map((panel) => (
                <SelectItem key={panel.id} value={panel.id}>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">{panel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {panel.species} • {panel.type}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Create New Panel</h4>
                <PanelForm onSubmit={handleCreatePanel} onCancel={() => setIsCreateOpen(false)} />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="bg-zinc-50 p-3 rounded-lg border space-y-1">
          <p className="text-xs text-muted-foreground">{activePanel.description}</p>
          <p className="text-xs text-zinc-500 font-medium">Condition: {activePanel.condition}</p>
        </div>
      </div>

      <PanelList cycles={activePanel.cycles} onUpdate={handleUpdateCycles} />
    </Card>
  )
}
