"use client"

import { type OntologyValue } from "@/components/ontology-combobox"
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
import { usePanelsSignal } from "@/stores/panels"
import { Palette, Pencil, Plus } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { panelUrl, sendJson } from "./panel-api"
import type { CreatePanelFormData } from "./panel-form"
import { PanelForm } from "./panel-form"
import { PanelList } from "./panel-list"
import { PanelSettings, type VisibilityValue } from "./panel-settings"
import { PanelWarnings, type PanelWarning } from "./panel-warnings"
import { Panel, PanelCycle, PRESERVATION_LABELS } from "./types"

function panelSummary(panel: Panel): string {
  const species = panel.species?.label ?? null
  const preservation = panel.preservation ? PRESERVATION_LABELS[panel.preservation] : null
  return (
    [species, preservation, panel.fixative?.label, panel.imagingMethod?.label].filter(Boolean).join(", ") ||
    "No species, preservation or method set"
  )
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
      const res = await fetch(`${panelUrl(panelId)}/validate`)
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
      const res = await sendJson("/api/panels", "POST", {
        name: data.name,
        description: data.description || undefined,
        speciesId: data.speciesId || undefined,
        speciesLabel: data.speciesLabel || undefined,
        preservation: data.preservation || undefined,
        fixativeId: data.fixativeId || undefined,
        fixativeLabel: data.fixativeLabel || undefined,
        imagingMethodId: data.imagingMethodId || undefined,
        imagingMethodLabel: data.imagingMethodLabel || undefined,
        conditionId: data.conditionId || undefined,
        conditionLabel: data.conditionLabel || undefined,
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
      const res = await fetch(panelUrl(panelToDelete.id), { method: "DELETE" })

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

  const applyPanelFields = (panelId: string, fields: Partial<Panel>) =>
    setPanels((ps) => ps.map((p) => (p.id === panelId ? { ...p, ...fields } : p)))

  // Applies the change locally first, then rolls back to `previous` if the PATCH fails.
  const updatePanel = async ({
    panelId,
    next,
    previous,
    body,
    successMessage,
    errorMessage,
    onSuccess,
  }: {
    panelId: string
    next: Partial<Panel>
    previous: Partial<Panel>
    body: Record<string, unknown>
    successMessage: string
    errorMessage: string
    onSuccess?: () => void
  }) => {
    applyPanelFields(panelId, next)
    try {
      const res = await sendJson(panelUrl(panelId), "PATCH", body)
      if (!res.ok) throw new Error("Request failed")
      onSuccess?.()
      notifyPanelsChanged()
      toast.success(successMessage)
    } catch {
      applyPanelFields(panelId, previous)
      toast.error(errorMessage)
    }
  }

  const commitRename = async (panelId: string) => {
    if (nameDraft === null || renameCancelledRef.current) return
    const nextName = nameDraft.trim()
    setNameDraft(null)
    const previous = panels.find((p) => p.id === panelId)
    if (!nextName || nextName === previous?.name) return

    await updatePanel({
      panelId,
      next: { name: nextName },
      previous: previous ? { name: previous.name } : {},
      body: { name: nextName },
      successMessage: "Panel renamed",
      errorMessage: "Failed to rename panel",
    })
  }

  const handleImagingMethodChange = async (panelId: string, method: OntologyValue | null) => {
    const previous = panels.find((p) => p.id === panelId)
    await updatePanel({
      panelId,
      next: { imagingMethodId: method?.id ?? null, imagingMethod: method ? { ...method, parent: null } : null },
      previous: previous ? { imagingMethodId: previous.imagingMethodId, imagingMethod: previous.imagingMethod } : {},
      body: { imagingMethodId: method?.id ?? null, imagingMethodLabel: method?.label },
      successMessage: method ? `Imaging method set to ${method.label}` : "Imaging method cleared",
      errorMessage: "Failed to update imaging method",
      onSuccess: () => fetchValidation(panelId),
    })
  }

  const handleVisibilityChange = (panelId: string, prev: VisibilityValue, next: VisibilityValue) =>
    updatePanel({
      panelId,
      next: { visibility: next.visibility, sharedLabIds: next.sharedLabIds },
      previous: { visibility: prev.visibility, sharedLabIds: prev.sharedLabIds },
      body: { visibility: next.visibility, sharedLabIds: next.sharedLabIds },
      successMessage: "Panel visibility updated",
      errorMessage: "Failed to update panel visibility",
    })

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
                    {panels.map((panel) => (
                      <SelectItem key={panel.id} value={String(panel.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{panel.name}</span>
                          <span className="text-xs text-muted-foreground">{panelSummary(panel)}</span>
                        </div>
                      </SelectItem>
                    ))}
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
          <PanelSettings
            panel={activePanel}
            labs={userLabs}
            labsLoading={labsLoading}
            onVisibilityChange={(prev, next) => handleVisibilityChange(activePanel.id, prev, next)}
            onImagingMethodChange={(next) => handleImagingMethodChange(activePanel.id, next)}
            onDelete={() => handleDeletePanel(activePanel.id)}
          />
        )}
      </div>

      <PanelWarnings warnings={warnings} />

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
