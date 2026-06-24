"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AntigenRetrieval, MultiplexMethod } from "@/lib/generated/prisma/enums"
import { Check, Pencil } from "lucide-react"
import { StepBadge } from "./step-badge"
import {
  ANTIGEN_RETRIEVAL_OPTIONS,
  FIXATION_OPTIONS,
  METHOD_OPTIONS,
  fixationLabel,
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
  const collapsed = !editing

  const summary = [
    context.name,
    context.species?.label,
    context.tissue?.label,
    fixationLabel(context.fixation),
    methodLabel(context.method),
    context.antigenRetrieval,
    context.condition?.label,
  ].filter(Boolean)

  return (
    <section className={collapsed ? "bg-muted/30" : undefined}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <StepBadge n={1} state={collapsed ? "done" : "active"} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Experiment context</h2>
            {collapsed ? (
              <p className="truncate text-xs text-muted-foreground">{summary.join(" · ")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Applies to every antibody you add.</p>
            )}
          </div>
        </div>
        {collapsed && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Experiment name (optional)</Label>
            <Input
              value={context.name}
              onChange={(event) => onChange({ ...context, name: event.target.value })}
              placeholder="e.g. Tonsil CODEX immune panel"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={context.description}
              onChange={(event) => onChange({ ...context, description: event.target.value })}
              placeholder="Briefly describe this experiment so it can be cited from a publication."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Target Species</Label>
              <OntologyCombobox
                ontologyType="ncbi_taxonomy"
                value={context.species}
                onChange={(species) => onChange({ ...context, species })}
                placeholder="Search species..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tissue Type</Label>
              <OntologyCombobox
                ontologyType="uberon"
                value={context.tissue}
                onChange={(tissue) => onChange({ ...context, tissue })}
                placeholder="Search tissue..."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Fixation</Label>
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
              <Label>Method</Label>
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
              <Label>Antigen Retrieval</Label>
              <Select
                value={context.antigenRetrieval}
                onValueChange={(antigenRetrieval) =>
                  onChange({ ...context, antigenRetrieval: antigenRetrieval as AntigenRetrieval })
                }
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
          </div>

          <Button type="button" size="sm" onClick={onDone}>
            <Check className="size-4" />
            Next
          </Button>
        </div>
      )}
    </section>
  )
}
