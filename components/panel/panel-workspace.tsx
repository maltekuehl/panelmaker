"use client"

import { ImagingMethodSelect, useImagingMethods } from "@/components/imaging-method-select"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { Visibility } from "@/lib/generated/prisma/enums"
import { cn } from "@/lib/utils"
import { usePanelsSignal } from "@/stores/panels"
import { AlertTriangle, Download, Info, Palette, Pencil, Plus, Trash2, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { PanelExportMenu } from "./panel-export-menu"
import type { CreatePanelFormData } from "./panel-form"
import { PanelForm } from "./panel-form"
import { PanelList } from "./panel-list"
import { FIXATION_LABELS, Panel, PanelCycle } from "./types"

type VisibilityValue = {
  visibility: Visibility
  sharedLabIds: string[]
}

type PanelWarning = {
  type: string
  severity: "info" | "warning" | "error"
  cycleId?: string
  markers?: string[]
  message: string
}

const SEVERITY_LABELS = { error: "Error", warning: "Warning", info: "Note" } as const

function SeverityIcon({ severity }: { severity: PanelWarning["severity"] }) {
  const Icon = severity === "error" ? XCircle : severity === "warning" ? AlertTriangle : Info
  return <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
}

export function PanelWorkspace() {
  const [panels, setPanels] = useState<Panel[]>([])
  const [activePanelId, setActivePanelId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [warnings, setWarnings] = useState<PanelWarning[]>([])
  const [panelToDelete, setPanelToDelete] = useState<Panel | null>(null)
  const [userLabs, setUserLabs] = useState<{ id: string; name: string }[]>([])
  const [labsLoading, setLabsLoading] = useState(true)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const renameCancelledRef = useRef(false)
  const { imagingMethods } = useImagingMethods()
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
      const fetched: Panel[] = json.panels ?? []
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
    } catch {}
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
    try {
      const res = await fetch("/api/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          speciesId: data.speciesId || undefined,
          speciesLabel: data.speciesLabel || undefined,
          fixation: data.fixation || undefined,
          imagingMethodId: data.imagingMethodId || undefined,
          conditionId: data.conditionId || undefined,
          conditionLabel: data.conditionLabel || undefined,
        }),
      })

      if (!res.ok) {
        toast.error("Failed to create panel")
        return
      }

      const json = await res.json()
      const newPanel: Panel = json.panel
      setPanels((prev) => [newPanel, ...prev])
      setActivePanelId(newPanel.id)
      setIsCreateOpen(false)
      notifyPanelsChanged()
      toast.success("Panel created")
    } catch {
      toast.error("Failed to create panel")
    } finally {
      setIsCreating(false)
    }
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

    try {
      const res = await fetch(`/api/panels/${panelToDelete.id}`, { method: "DELETE" })

      if (!res.ok) {
        toast.error("Failed to delete panel")
        return
      }

      const remaining = panels.filter((p) => p.id !== panelToDelete.id)
      setPanels(remaining)
      setActivePanelId(remaining.length > 0 ? remaining[0].id : null)
      notifyPanelsChanged()
      toast.success("Panel deleted")
    } catch {
      toast.error("Failed to delete panel")
    } finally {
      setPanelToDelete(null)
    }
  }

  const commitRename = async (panelId: string) => {
    if (nameDraft === null || renameCancelledRef.current) return
    const nextName = nameDraft.trim()
    setNameDraft(null)
    const previousName = panels.find((p) => p.id === panelId)?.name
    if (!nextName || nextName === previousName) return

    const applyName = (name: string | undefined) =>
      setPanels((ps) => ps.map((p) => (p.id === panelId && name !== undefined ? { ...p, name } : p)))

    applyName(nextName)

    try {
      const res = await fetch(`/api/panels/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      })

      if (!res.ok) throw new Error("Request failed")

      notifyPanelsChanged()
      toast.success("Panel renamed")
    } catch {
      applyName(previousName)
      toast.error("Failed to rename panel")
    }
  }

  const handleImagingMethodChange = async (panelId: string, next: string | null) => {
    const previous = panels.find((p) => p.id === panelId) ?? null
    const method = next ? (imagingMethods.find((m) => m.id === next) ?? null) : null

    setPanels((ps) => ps.map((p) => (p.id === panelId ? { ...p, imagingMethodId: next, imagingMethod: method } : p)))

    try {
      const res = await fetch(`/api/panels/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagingMethodId: next }),
      })

      if (!res.ok) throw new Error("Request failed")

      fetchValidation(panelId)
      notifyPanelsChanged()
      toast.success(method ? `Imaging method set to ${method.label}` : "Imaging method cleared")
    } catch {
      setPanels((ps) =>
        ps.map((p) =>
          p.id === panelId && previous
            ? { ...p, imagingMethodId: previous.imagingMethodId, imagingMethod: previous.imagingMethod }
            : p,
        ),
      )
      toast.error("Failed to update imaging method")
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

    const rollback = () => {
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
    }

    try {
      const res = await fetch(`/api/panels/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next.visibility, sharedLabIds: next.sharedLabIds }),
      })

      if (!res.ok) {
        rollback()
        return
      }

      notifyPanelsChanged()
      toast.success("Panel visibility updated")
    } catch {
      rollback()
    }
  }

  const activePanel = panels.find((p) => p.id === activePanelId) ?? panels[0] ?? null

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-0">
      <div className="p-4 pb-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {panels.length > 0 ? (
            <>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              {activePanel && nameDraft !== null ? (
                <Input
                  autoFocus
                  aria-label="Panel name"
                  value={nameDraft}
                  maxLength={255}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={() => commitRename(activePanel.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.currentTarget.blur()
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      renameCancelledRef.current = true
                      setNameDraft(null)
                    }
                  }}
                  className="h-10 min-w-0 flex-1 font-medium"
                />
              ) : (
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
                              {[pSpecies, pFixation, panel.imagingMethod?.shortLabel].filter(Boolean).join(", ") ||
                                "No species, fixation or method set"}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
              {activePanel && nameDraft === null && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  onClick={() => {
                    renameCancelledRef.current = false
                    setNameDraft(activePanel.name)
                  }}
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">Rename panel</span>
                </Button>
              )}
            </>
          ) : (
            <div></div>
          )}
          <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="size-10 shrink-0">
                <Plus className="size-4" />
                <span className="sr-only">New panel</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Create new panel" className="w-80" align="end">
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
                    visibility: activePanel.visibility ?? "PRIVATE",
                    sharedLabIds: activePanel.sharedLabIds ?? [],
                  }}
                  onChange={(next) => {
                    const prev: VisibilityValue = {
                      visibility: activePanel.visibility ?? "PRIVATE",
                      sharedLabIds: activePanel.sharedLabIds ?? [],
                    }
                    handleVisibilityChange(activePanel.id, prev, next)
                  }}
                  labs={userLabs}
                  disabled={labsLoading}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PanelExportMenu
                  panelId={activePanel.id}
                  trigger={
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                      <Download className="size-3.5" />
                      <span className="sr-only">Export Panel</span>
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeletePanel(activePanel.id)}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete Panel</span>
                </Button>
              </div>
            </div>
            <div className="border-t pt-3">
              <label htmlFor="panel-imaging-method" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Imaging method
              </label>
              <ImagingMethodSelect
                id="panel-imaging-method"
                value={activePanel.imagingMethodId ?? null}
                onChange={(next) => handleImagingMethodChange(activePanel.id, next)}
                className="h-8 text-xs"
              />
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

      <div className="px-4 empty:hidden" aria-live="polite">
        {warnings.length > 0 && (
          <div className="space-y-1.5 pt-4">
            {warnings.map((w, i) => (
              <div
                key={`${w.type}-${w.cycleId ?? "panel"}-${i}`}
                className={cn(
                  "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
                  w.severity === "error"
                    ? "border border-destructive/20 bg-destructive/10 text-destructive"
                    : w.severity === "warning"
                      ? "border border-warning/30 bg-warning/10 text-warning"
                      : "border border-primary/20 bg-primary/10 text-primary",
                )}
              >
                <SeverityIcon severity={w.severity} />
                <span>
                  <span className="font-medium">{SEVERITY_LABELS[w.severity]}:</span> {w.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {activePanel ? (
        <PanelList
          panelId={activePanel.id}
          cycles={activePanel.cycles}
          species={activePanel.species}
          onCyclesChange={(newCycles) => handleCyclesChange(activePanel.id, newCycles)}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-sm text-muted-foreground">You have no panels yet.</p>
          <Button onClick={() => setIsCreateOpen(true)}>Create your first panel</Button>
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
            <AlertDialogAction variant="destructive" onClick={confirmDeletePanel}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
