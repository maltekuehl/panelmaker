"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiplexMethod } from "@/lib/generated/prisma/enums"
import { Pencil } from "lucide-react"
import {
  ANTIGEN_RETRIEVAL_OPTIONS,
  FIXATION_OPTIONS,
  METHOD_OPTIONS,
  fixationLabel,
  isContextComplete,
  methodLabel,
  type ExperimentContext,
} from "./types"

export function ExperimentContextSection({
  context,
  onChange,
  editing,
  onEdit,
  onDone,
}: {
  context: ExperimentContext
  onChange: (next: ExperimentContext) => void
  editing: boolean
  onEdit: () => void
  onDone: () => void
}) {
  const complete = isContextComplete(context)

  if (!editing && complete) {
    const summary = [
      context.species?.label,
      context.tissue?.label,
      fixationLabel(context.fixation),
      methodLabel(context.method),
      context.antigenRetrieval,
      context.condition?.label,
    ].filter(Boolean)

    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Experiment context</h2>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {summary.map((part, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>·</span>}
              <span className="font-medium text-foreground">{part}</span>
            </span>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Experiment context</h2>
        <p className="text-sm text-muted-foreground">These details apply to every antibody you add below.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            Target Species <span className="text-destructive">*</span>
          </Label>
          <OntologyCombobox
            ontologyType="ncbi_taxonomy"
            value={context.species}
            onChange={(species) => onChange({ ...context, species })}
            placeholder="Search species..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Tissue Type <span className="text-destructive">*</span>
          </Label>
          <OntologyCombobox
            ontologyType="uberon"
            value={context.tissue}
            onChange={(tissue) => onChange({ ...context, tissue })}
            placeholder="Search tissue..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>
            Fixation <span className="text-destructive">*</span>
          </Label>
          <Select value={context.fixation} onValueChange={(fixation) => onChange({ ...context, fixation })}>
            <SelectTrigger>
              <SelectValue placeholder="Select fixation" />
            </SelectTrigger>
            <SelectContent>
              {FIXATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            Method <span className="text-destructive">*</span>
          </Label>
          <Select
            value={context.method}
            onValueChange={(method) => onChange({ ...context, method: method as MultiplexMethod })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            Antigen Retrieval <span className="text-destructive">*</span>
          </Label>
          <Select
            value={context.antigenRetrieval}
            onValueChange={(antigenRetrieval) => onChange({ ...context, antigenRetrieval })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AR" />
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
        <Label>Condition (optional)</Label>
        <OntologyCombobox
          ontologyType="doid"
          value={context.condition}
          onChange={(condition) => onChange({ ...context, condition })}
          placeholder="Search disease ontology (e.g. carcinoma, nephropathy)..."
        />
        <p className="text-xs text-muted-foreground">Search the Disease Ontology for the condition being studied.</p>
      </div>

      <Button type="button" size="sm" onClick={onDone} disabled={!complete}>
        Next
      </Button>
    </section>
  )
}
