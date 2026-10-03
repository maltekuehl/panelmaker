"use client"

import { VisibilitySelector } from "@/components/shared/visibility-selector"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExperimentContext } from "./types"

export function ExperimentDetailsSection({
  context,
  onChange,
  nameInvalid,
  labs,
}: {
  context: ExperimentContext
  onChange: (next: ExperimentContext) => void
  nameInvalid: boolean
  labs: { id: string; name: string }[]
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="experiment-name">
            Experiment name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="experiment-name"
            value={context.name}
            onChange={(event) => onChange({ ...context, name: event.target.value })}
            placeholder="e.g. Tonsil CODEX immune panel"
            aria-invalid={nameInvalid || undefined}
            aria-describedby={nameInvalid ? "experiment-name-error" : undefined}
          />
          {nameInvalid && (
            <p id="experiment-name-error" className="text-xs text-destructive">
              Give the experiment a name so the reports can be grouped.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="experiment-description">Description</Label>
          <Textarea
            id="experiment-description"
            value={context.description}
            onChange={(event) => onChange({ ...context, description: event.target.value })}
            placeholder="Briefly describe this experiment so it can be cited from a publication."
            rows={3}
          />
        </div>

        <VisibilitySelector
          value={{ visibility: context.visibility, sharedLabIds: context.sharedLabIds }}
          onChange={(next) => onChange({ ...context, visibility: next.visibility, sharedLabIds: next.sharedLabIds })}
          labs={labs}
        />
      </div>

      <div className="space-y-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
        <h3 className="text-sm font-semibold">Publication (optional)</h3>
        <div className="space-y-1.5">
          <Label htmlFor="experiment-citation">Citation (APA format)</Label>
          <Textarea
            id="experiment-citation"
            value={context.citation}
            onChange={(event) => onChange({ ...context, citation: event.target.value })}
            placeholder="Author, A. A. (Year). Title of work. Journal, Volume(Issue), pages."
            rows={2}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="experiment-pmid">PMID</Label>
            <Input
              id="experiment-pmid"
              value={context.pmid}
              onChange={(event) => onChange({ ...context, pmid: event.target.value })}
              placeholder="e.g. 38000000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="experiment-doi">DOI</Label>
            <Input
              id="experiment-doi"
              value={context.doi}
              onChange={(event) => onChange({ ...context, doi: event.target.value })}
              placeholder="e.g. 10.1038/s41586-024-00000-0"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="experiment-protocol-doi">Protocol DOI</Label>
            <Input
              id="experiment-protocol-doi"
              value={context.protocolDoi}
              onChange={(event) => onChange({ ...context, protocolDoi: event.target.value })}
              placeholder="e.g. 10.17504/protocols.io.81wgb1m3yvpk/v3"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
