"use client"

import { FluorophoreCombobox, type FluorophoreOption } from "@/components/fluorophore-combobox"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { signInUrl } from "@/lib/routes"
import { usePanelsSignal } from "@/stores/panels"
import { Loader2, Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState, type ComponentProps } from "react"
import { toast } from "sonner"
import { addPanelMarker, sendJson } from "./panel-api"
import { PanelForm, type CreatePanelFormData } from "./panel-form"

type PanelOption = {
  id: string
  name: string
  cycles: { id: string; name: string }[]
}

type AddToPanelButtonProps = Pick<ComponentProps<typeof Button>, "variant" | "size" | "className"> & {
  proteinId?: string
  proteinLabel?: string
  geneSymbol?: string
  ensemblGeneId?: string
  antibodyId?: string
  label: string
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
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const notifyPanelsChanged = usePanelsSignal((s) => s.notifyPanelsChanged)
  const [open, setOpen] = useState(false)
  const [panels, setPanels] = useState<PanelOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [fluorophore, setFluorophore] = useState<FluorophoreOption | null>(null)

  const fetchPanels = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/panels")
      if (!res.ok) return
      const json = await res.json()
      const panelsList: PanelOption[] = json.panels ?? []
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
      const error = await addPanelMarker(panelId, {
        cycleId: selectedCycleId,
        proteinId: proteinId || undefined,
        proteinLabel: proteinLabel || label || undefined,
        geneSymbol: geneSymbol || undefined,
        ensemblGeneId: ensemblGeneId || undefined,
        antibodyId: antibodyId || undefined,
        fluorophoreId: fluorophore?.id || undefined,
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success(`${label} added to panel`)
      notifyPanelsChanged()
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
      const res = await sendJson("/api/panels", "POST", data)

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Failed to create panel")
        return
      }

      toast.success("Panel created")
      notifyPanelsChanged()
      setShowCreateForm(false)
      await fetchPanels()
    } catch {
      toast.error("Failed to create panel")
    } finally {
      setIsCreating(false)
    }
  }

  if (status !== "authenticated" || !session?.user) {
    return (
      <Button asChild variant={variant} size={size} className={className} title="Sign in to add markers to a panel">
        <Link href={signInUrl(pathname)}>
          <Plus className="size-4" />
          {!iconOnly && "Add to Panel"}
        </Link>
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          title={iconOnly ? `Add ${label} to panel` : undefined}
        >
          <Plus className="size-4" />
          {!iconOnly && "Add to Panel"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add {label} to Panel</DialogTitle>
          <DialogDescription>Choose a panel and cycle, then optionally set a fluorophore.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : showCreateForm ? (
          <PanelForm onSubmit={handleCreatePanel} onCancel={() => setShowCreateForm(false)} isSubmitting={isCreating} />
        ) : panels.length === 0 ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">No panels yet. Create one to get started.</p>
            <Button variant="outline" onClick={() => setShowCreateForm(true)}>
              <Plus className="size-4" />
              Create Panel
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div role="group" aria-labelledby="add-to-panel-cycle-label">
              <p id="add-to-panel-cycle-label" className="text-sm font-medium">
                Panel and cycle
              </p>
              <div className="mt-1 max-h-[180px] overflow-y-auto rounded-md border">
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
                <Plus className="size-3" />
                New Panel
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-to-panel-fluorophore" className="text-xs">
                Fluorophore
              </Label>
              <FluorophoreCombobox id="add-to-panel-fluorophore" value={fluorophore} onChange={setFluorophore} />
            </div>

            <Button onClick={handleAdd} disabled={isAdding || !selectedCycleId} className="w-full">
              {isAdding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add to Cycle
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
