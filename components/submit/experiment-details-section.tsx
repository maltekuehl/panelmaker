"use client"

import { VisibilitySelector } from "@/components/shared/visibility-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, Pencil } from "lucide-react"
import { StepBadge } from "./step-badge"
import { isContextComplete, type ExperimentContext } from "./types"

const VISIBILITY_LABELS: Record<ExperimentContext["visibility"], string> = {
  PRIVATE: "Private",
  LAB: "Lab",
  PUBLIC: "Public",
}

export function ExperimentDetailsSection({
  context,
  onChange,
  state,
  onEdit,
  onDone,
  labs,
}: {
  context: ExperimentContext
  onChange: (next: ExperimentContext) => void
  state: "active" | "done" | "disabled"
  onEdit: () => void
  onDone: () => void
  labs: { id: string; name: string }[]
}) {
  const collapsed = state !== "active"
  const cited = Boolean(context.citation.trim() || context.pmid.trim() || context.doi.trim())

  const summary = [context.name, VISIBILITY_LABELS[context.visibility], cited ? "Cited" : null].filter(Boolean)

  return (
    <section className={collapsed ? "bg-muted/30" : undefined}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <StepBadge n={1} state={state} />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Experiment details</h2>
            {collapsed ? (
              <p className="truncate text-xs text-muted-foreground">{summary.join(" · ")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Name, description, publication, and who can see it.</p>
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
          <div className="space-y-1.5">
            <Label>Experiment name</Label>
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

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Publication (optional)</p>
            <div className="space-y-1.5">
              <Label>Citation (APA format)</Label>
              <Textarea
                value={context.citation}
                onChange={(event) => onChange({ ...context, citation: event.target.value })}
                placeholder="Author, A. A. (Year). Title of work. Journal, Volume(Issue), pages."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>PMID</Label>
                <Input
                  value={context.pmid}
                  onChange={(event) => onChange({ ...context, pmid: event.target.value })}
                  placeholder="e.g. 38000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>DOI</Label>
                <Input
                  value={context.doi}
                  onChange={(event) => onChange({ ...context, doi: event.target.value })}
                  placeholder="e.g. 10.1038/s41586-024-00000-0"
                />
              </div>
            </div>
          </div>

          <VisibilitySelector
            value={{ visibility: context.visibility, sharedLabIds: context.sharedLabIds }}
            onChange={(next) => onChange({ ...context, visibility: next.visibility, sharedLabIds: next.sharedLabIds })}
            labs={labs}
          />

          <div className="space-y-1.5">
            <Button type="button" size="sm" onClick={onDone} disabled={!isContextComplete(context)}>
              <Check className="size-4" />
              Next
            </Button>
            {!isContextComplete(context) && (
              <p className="text-xs text-muted-foreground">Add an experiment name to continue.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
