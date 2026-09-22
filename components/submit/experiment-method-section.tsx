"use client"

import { ImagingMethodSelect, useImagingMethods } from "@/components/imaging-method-select"
import { OntologyCombobox } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ANTIGEN_RETRIEVAL_LABELS } from "@/lib/constants"
import { AntigenRetrieval } from "@/lib/generated/prisma/enums"
import { Check, Pencil } from "lucide-react"
import { SpecimenSection } from "./specimen-section"
import { StepBadge } from "./step-badge"
import {
  ANTIGEN_RETRIEVAL_OPTIONS,
  PRESERVATION_OPTIONS,
  preservationOptionLabel,
  type ExperimentContext,
} from "./types"

export function ExperimentMethodSection({
  context,
  onChange,
  state,
  onEdit,
  onDone,
}: {
  context: ExperimentContext
  onChange: (next: ExperimentContext) => void
  state: "active" | "done" | "disabled"
  onEdit: () => void
  onDone: () => void
}) {
  const collapsed = state !== "active"
  const { imagingMethods } = useImagingMethods()

  const summary = [
    context.species?.label,
    context.tissue?.label,
    preservationOptionLabel(context.preservation),
    imagingMethods.find((m) => m.id === context.imagingMethodId)?.shortLabel,
    context.antigenRetrieval ? ANTIGEN_RETRIEVAL_LABELS[context.antigenRetrieval] : undefined,
    context.condition?.label,
  ].filter(Boolean)

  return (
    <section className={collapsed ? "bg-muted/30" : undefined}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <StepBadge n={2} state={state} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Sample &amp; method</h2>
            {state === "active" ? (
              <p className="text-xs text-muted-foreground">Applies to every antibody you add.</p>
            ) : state === "done" ? (
              <p className="truncate text-xs text-muted-foreground">{summary.join(", ") || "No details set"}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Set the experiment details first.</p>
            )}
          </div>
        </div>
        {state === "done" && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {state === "active" && (
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="method-species">Target Species</Label>
              <OntologyCombobox
                id="method-species"
                ontologyType="ncbi_taxonomy"
                value={context.species}
                onChange={(species) => onChange({ ...context, species })}
                placeholder="Search species…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method-tissue">Tissue Type</Label>
              <OntologyCombobox
                id="method-tissue"
                ontologyType="uberon"
                value={context.tissue}
                onChange={(tissue) => onChange({ ...context, tissue })}
                placeholder="Search tissue…"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="method-preservation">Preservation</Label>
              <Select
                value={context.preservation}
                onValueChange={(preservation) => onChange({ ...context, preservation })}
              >
                <SelectTrigger id="method-preservation">
                  <SelectValue placeholder="Select preservation" />
                </SelectTrigger>
                <SelectContent>
                  {PRESERVATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-64 space-y-1.5">
              <Label htmlFor="method-method">Imaging method</Label>
              <ImagingMethodSelect
                id="method-method"
                value={context.imagingMethodId || null}
                onChange={(imagingMethodId) => onChange({ ...context, imagingMethodId: imagingMethodId ?? "" })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method-retrieval">Antigen Retrieval</Label>
              <Select
                value={context.antigenRetrieval}
                onValueChange={(antigenRetrieval) =>
                  onChange({ ...context, antigenRetrieval: antigenRetrieval as AntigenRetrieval })
                }
              >
                <SelectTrigger id="method-retrieval">
                  <SelectValue placeholder="Select retrieval" />
                </SelectTrigger>
                <SelectContent>
                  {ANTIGEN_RETRIEVAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method-condition">Condition (optional)</Label>
            <OntologyCombobox
              id="method-condition"
              ontologyType="doid"
              value={context.condition}
              onChange={(condition) => onChange({ ...context, condition })}
              placeholder="Search disease ontology (e.g. carcinoma, nephropathy)…"
            />
          </div>

          <SpecimenSection
            specimen={context.specimen}
            species={context.species}
            onChange={(specimen) => onChange({ ...context, specimen })}
          />

          <Button type="button" size="sm" onClick={onDone}>
            <Check className="size-4" />
            Next
          </Button>
        </div>
      )}
    </section>
  )
}
