"use client"

import { VisibilitySelector } from "@/components/shared/visibility-selector"
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
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { usePanelsSignal } from "@/stores/panels"
import { AlertTriangle, Download, Palette, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { CreatePanelFormData } from "./panel-form"
import { PanelForm } from "./panel-form"
import { PanelList } from "./panel-list"
import { FIXATION_LABELS, Panel, PanelCycle } from "./types"

type VisibilityValue = {
  visibility: "PRIVATE" | "LAB" | "PUBLIC"
  sharedLabIds: string[]
}

type PanelWarning = {
  type: string
  severity: "info" | "warning" | "error"
  cycleId?: string
  markers?: string[]
  message: string
}

export function PanelWorkspace({ flat = false }: { flat?: boolean }) {
  const [panels, setPanels] = useState<Panel[]>([])
  const [activePanelId, setActivePanelId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [warnings, setWarnings] = useState<PanelWarning[]>([])
  const [panelToDelete, setPanelToDelete] = useState<Panel | null>(null)
  const [userLabs, setUserLabs] = useState<{ id: string; name: string }[]>([])
  const [labsLoading, setLabsLoading] = useState(true)
  const panelsVersion = usePanelsSignal((s) => s.version)
  const notifyPanelsChanged = usePanelsSignal((s) => s.notifyPanelsChanged)

  const fetchPanels = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await fetch("/api/panels")

      if (res.status === 401) return

      if (!res.ok) {
        toast.error("Failed to load panels")
        return
      }

      const json = await res.json()
      const fetched: Panel[] = json.data?.panels ?? json.panels ?? []
      setPanels(fetched)
      setActivePanelId((current) =>
        current && fetched.some((p) => p.id === current) ? current : (fetched[0]?.id ?? null),
      )
    } catch {
      toast.error("Failed to load panels")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPanels()
  }, [fetchPanels])

  useEffect(() => {
    if (panelsVersion === 0) return
    fetchPanels({ silent: true })
  }, [panelsVersion, fetchPanels])

  useEffect(() => {
    let cancelled = false
    fetch("/api/labs")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return
        const labs = (json.labs ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))
        setUserLabs(labs)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLabsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fetchValidation = async (panelId: string) => {
    try {
      const res = await fetch(`/api/panels/${panelId}/validate`)
      if (!res.ok) return
      const json = await res.json()
      setWarnings(json.warnings ?? [])
    } catch {
      // Silently fail — validation warnings are non-critical
    }
  }

  useEffect(() => {
    if (activePanelId !== null) {
      fetchValidation(activePanelId)
    } else {
      setWarnings([])
    }
  }, [activePanelId])

  const handleCreatePanel = async (data: CreatePanelFormData) => {
    setIsCreating(true)

    const res = await fetch("/api/panels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        description: data.description || undefined,
        speciesId: data.speciesId || undefined,
        speciesLabel: data.speciesLabel || undefined,
        fixation: data.fixation || undefined,
        conditionId: data.conditionId || undefined,
        conditionLabel: data.conditionLabel || undefined,
      }),
    })

    setIsCreating(false)

    if (!res.ok) {
      toast.error("Failed to create panel")
      return
    }

    const json = await res.json()
    const newPanel: Panel = json.data?.panel ?? json.panel
    setPanels((prev) => [newPanel, ...prev])
    setActivePanelId(newPanel.id)
    setIsCreateOpen(false)
    notifyPanelsChanged()
    toast.success("Panel created")
  }

  const handleCyclesChange = (panelId: string, newCycles: PanelCycle[]) => {
    setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, cycles: newCycles } : p)))
    fetchValidation(panelId)
    notifyPanelsChanged()
  }

  const handleDeletePanel = (panelId: string) => {
    const panel = panels.find((p) => p.id === panelId)
    if (!panel) return
    setPanelToDelete(panel)
  }

  const confirmDeletePanel = async () => {
    if (!panelToDelete) return

    const res = await fetch(`/api/panels/${panelToDelete.id}`, { method: "DELETE" })

    if (!res.ok) {
      toast.error("Failed to delete panel")
      return
    }

    const remaining = panels.filter((p) => p.id !== panelToDelete.id)
    setPanels(remaining)
    setActivePanelId(remaining.length > 0 ? remaining[0].id : null)
    setPanelToDelete(null)
    notifyPanelsChanged()
    toast.success("Panel deleted")
  }

  const handleExport = async (panelId: string, format: "csv" | "order" | "json") => {
    try {
      const res = await fetch(`/api/panels/${panelId}/export?format=${format}`)
      if (!res.ok) {
        toast.error("Failed to export panel")
        return
      }
      const blob = await res.blob()
      const contentDisposition = res.headers.get("Content-Disposition")
      const filename = contentDisposition
        ? (contentDisposition.split("filename=")[1]?.replace(/"/g, "") ?? `panel.${format === "json" ? "json" : "csv"}`)
        : `panel.${format === "json" ? "json" : "csv"}`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Panel exported")
    } catch {
      toast.error("Failed to export panel")
    }
  }

  const handleVisibilityChange = async (panelId: string, prev: VisibilityValue, next: VisibilityValue) => {
    setPanels((ps) =>
      ps.map((p) =>
        p.id === panelId
          ? {
              ...p,
              visibility: next.visibility,
              sharedLabIds: next.sharedLabIds,
            }
          : p,
      ),
    )

    const res = await fetch(`/api/panels/${panelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next.visibility, sharedLabIds: next.sharedLabIds }),
    })

    if (!res.ok) {
      setPanels((ps) =>
        ps.map((p) =>
          p.id === panelId
            ? {
                ...p,
                visibility: prev.visibility,
                sharedLabIds: prev.sharedLabIds,
              }
            : p,
        ),
      )
      toast.error("Failed to update panel visibility")
      return
    }

    notifyPanelsChanged()
    toast.success("Panel visibility updated")
  }

  const activePanel = panels.find((p) => p.id === activePanelId) ?? panels[0] ?? null

  const Wrapper = flat ? "div" : Card

  if (isLoading) {
    return (
      <Wrapper className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </Wrapper>
    )
  }

  return (
    <Wrapper className="flex h-full flex-col overflow-hidden p-0">
      <div className="p-4 pb-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {panels.length > 0 ? (
            <>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <Select value={activePanelId ?? undefined} onValueChange={(val) => setActivePanelId(val)}>
                <SelectTrigger className="h-10 min-w-0 flex-1 font-medium">
                  <SelectValue placeholder="Select panel" />
                </SelectTrigger>
                <SelectContent>
                  {panels.map((panel) => {
                    const pSpecies = panel.species?.label ?? null
                    const pFixation = panel.fixation
                      ? (FIXATION_LABELS[panel.fixation as keyof typeof FIXATION_LABELS] ?? panel.fixation)
                      : null
                    return (
                      <SelectItem key={panel.id} value={String(panel.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{panel.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[pSpecies, pFixation].filter(Boolean).join(" • ") || "No species / fixation set"}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </>
          ) : (
            <div></div>
          )}
          <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Create New Panel</h4>
                <PanelForm
                  onSubmit={handleCreatePanel}
                  onCancel={() => setIsCreateOpen(false)}
                  isSubmitting={isCreating}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {activePanel && (
          <div className="bg-muted/40 p-3 rounded-lg border space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <VisibilitySelector
                  value={{
                    visibility: (activePanel.visibility ?? "PRIVATE") as "PRIVATE" | "LAB" | "PUBLIC",
                    sharedLabIds: activePanel.sharedLabIds ?? [],
                  }}
                  onChange={(next) => {
                    const prev: VisibilityValue = {
                      visibility: (activePanel.visibility ?? "PRIVATE") as "PRIVATE" | "LAB" | "PUBLIC",
                      sharedLabIds: activePanel.sharedLabIds ?? [],
                    }
                    handleVisibilityChange(activePanel.id, prev, next)
                  }}
                  labs={userLabs}
                  disabled={labsLoading}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                      <Download className="h-3.5 w-3.5" />
                      <span className="sr-only">Export Panel</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport(activePanel.id, "csv")}>
                      Export Panel (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(activePanel.id, "order")}>
                      Export Order List (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(activePanel.id, "json")}>
                      Export Panel (JSON)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => handleDeletePanel(activePanel.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete Panel</span>
                </Button>
              </div>
            </div>
            {(activePanel.description || activePanel.condition) && (
              <div className="space-y-1 border-t pt-2">
                {activePanel.description && <p className="text-xs text-muted-foreground">{activePanel.description}</p>}
                {activePanel.condition && (
                  <p className="text-xs text-muted-foreground font-medium">Condition: {activePanel.condition.label}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="px-4 pt-4 pb-0">
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
                  w.severity === "error"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : w.severity === "warning"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-primary/10 text-primary border border-primary/20",
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePanel ? (
        <PanelList
          panelId={activePanel.id}
          cycles={activePanel.cycles}
          species={activePanel.species}
          onCyclesChange={(newCycles) => handleCyclesChange(activePanel.id, newCycles)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center px-8">
            Click on the plus icon in the upper right corner to create your first panel and get started.
          </p>
        </div>
      )}

      <AlertDialog open={panelToDelete !== null} onOpenChange={(open) => !open && setPanelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Panel</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{panelToDelete?.name}&quot; and all its cycles and markers will be permanently deleted. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
              onClick={confirmDeletePanel}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Wrapper>
  )
}
