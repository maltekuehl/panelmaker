"use client"

import { OntologyCombobox, type OntologyValue } from "@/components/ontology-combobox"
import { VisibilitySelector } from "@/components/shared/visibility-selector"
import { Button } from "@/components/ui/button"
import type { Visibility } from "@/lib/generated/prisma/enums"
import { Download, Trash2 } from "lucide-react"
import { PanelExportMenu } from "./panel-export-menu"
import type { Panel } from "./types"

export type VisibilityValue = {
  visibility: Visibility
  sharedLabIds: string[]
}

interface PanelSettingsProps {
  panel: Panel
  labs: { id: string; name: string }[]
  labsLoading: boolean
  onVisibilityChange: (prev: VisibilityValue, next: VisibilityValue) => void
  onImagingMethodChange: (method: OntologyValue | null) => void
  onDelete: () => void
}

export function PanelSettings({
  panel,
  labs,
  labsLoading,
  onVisibilityChange,
  onImagingMethodChange,
  onDelete,
}: PanelSettingsProps) {
  const visibility: VisibilityValue = {
    visibility: panel.visibility ?? "PRIVATE",
    sharedLabIds: panel.sharedLabIds ?? [],
  }

  return (
    <div className="bg-muted/40 p-3 rounded-lg border space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <VisibilitySelector
            value={visibility}
            onChange={(next) => onVisibilityChange(visibility, next)}
            labs={labs}
            disabled={labsLoading}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PanelExportMenu
            panelId={panel.id}
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
            onClick={onDelete}
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
        <OntologyCombobox
          id="panel-imaging-method"
          ontologyType="imaging_method"
          value={panel.imagingMethod}
          onChange={onImagingMethodChange}
          placeholder="Search EFO imaging methods…"
        />
      </div>
      {(panel.description || panel.condition) && (
        <div className="space-y-1 border-t pt-2">
          {panel.description && <p className="text-xs text-muted-foreground">{panel.description}</p>}
          {panel.condition && (
            <p className="text-xs text-muted-foreground font-medium">Condition: {panel.condition.label}</p>
          )}
        </div>
      )}
    </div>
  )
}
