"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { PanelForm, type CreatePanelFormData } from "./panel-form"

type PanelOption = {
  id: number
  name: string
  cycles: { id: number; name: string }[]
}

interface AddToPanelButtonProps {
  proteinId?: string
  proteinLabel?: string
  geneSymbol?: string
  ensemblGeneId?: string
  antibodyId?: number
  label: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "icon"
  className?: string
  iconOnly?: boolean
}

export function AddToPanelButton({
  proteinId,
  proteinLabel,
  geneSymbol,
  ensemblGeneId,
  antibodyId,
  label,
  variant = "default",
  size = "sm",
  className,
  iconOnly = false,
}: AddToPanelButtonProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [panels, setPanels] = useState<PanelOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null)
  const [fluorophore, setFluorophore] = useState("")
  const [metalTag, setMetalTag] = useState("")

  const fetchPanels = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/panels")
      if (!res.ok) return
      const json = await res.json()
      const panelsList: PanelOption[] = json.data?.panels ?? json.panels ?? []
      setPanels(panelsList)
      const first = panelsList[0]
      if (first?.cycles?.length > 0) {
        setSelectedCycleId(first.cycles[0].id)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setShowCreateForm(false)
    fetchPanels()
  }, [open, fetchPanels])

  const handleAdd = async () => {
    if (!selectedCycleId) {
      toast.error("Select a cycle first")
      return
    }

    const panelId = panels.find((p) => p.cycles.some((c) => c.id === selectedCycleId))?.id
    if (!panelId) return

    setIsAdding(true)

    try {
      const res = await fetch(`/api/panels/${panelId}/markers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: selectedCycleId,
          proteinId: proteinId || undefined,
          proteinLabel: proteinLabel || label || undefined,
          geneSymbol: geneSymbol || undefined,
          ensemblGeneId: ensemblGeneId || undefined,
          antibodyId: antibodyId || undefined,
          fluorophore: fluorophore || undefined,
          metalTag: metalTag || undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Failed to add marker")
        return
      }

      toast.success(`${label} added to panel`)
      setOpen(false)
    } catch {
      toast.error("Failed to add marker")
    } finally {
      setIsAdding(false)
    }
  }

  const handleCreatePanel = async (data: CreatePanelFormData) => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Failed to create panel")
        return
      }

      toast.success("Panel created")
      setShowCreateForm(false)
      await fetchPanels()
    } catch {
      toast.error("Failed to create panel")
    } finally {
      setIsCreating(false)
    }
  }

  if (!session?.user) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          title={iconOnly ? `Add ${label} to panel` : undefined}
        >
          <Plus className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-1"} />
          {!iconOnly && "Add to Panel"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add {label} to Panel</DialogTitle>
          <DialogDescription>Choose a panel and cycle, then optionally set fluorophore/metal tag.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showCreateForm ? (
          <PanelForm onSubmit={handleCreatePanel} onCancel={() => setShowCreateForm(false)} isSubmitting={isCreating} />
        ) : panels.length === 0 ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">No panels yet. Create one to get started.</p>
            <Button variant="outline" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Panel
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Panel &amp; Cycle</Label>
              <div className="border rounded-md max-h-[180px] overflow-y-auto mt-1">
                {panels.map((panel) => (
                  <div key={panel.id}>
                    <div className="px-3 py-1.5 bg-muted text-xs font-medium">{panel.name}</div>
                    {panel.cycles.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground italic">No cycles</div>
                    ) : (
                      panel.cycles.map((cycle) => (
                        <button
                          key={cycle.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${selectedCycleId === cycle.id ? "bg-primary/10 font-medium" : ""}`}
                          onClick={() => setSelectedCycleId(cycle.id)}
                        >
                          {cycle.name}
                        </button>
                      ))
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs text-muted-foreground"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                New Panel
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fluorophore</Label>
                <Input
                  placeholder="e.g., AF488"
                  value={fluorophore}
                  onChange={(e) => setFluorophore(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Metal Tag</Label>
                <Input
                  placeholder="e.g., 142Nd"
                  value={metalTag}
                  onChange={(e) => setMetalTag(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button onClick={handleAdd} disabled={isAdding || !selectedCycleId} className="w-full">
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add to Cycle
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
