"use client"

import { Field } from "@/components/shared/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RECOMMENDATION_LABELS, VALIDATION_RESULT_LABELS } from "@/lib/constants"
import type { Recommendation, ValidationResult } from "@/lib/generated/prisma/enums"
import { cn } from "@/lib/utils"
import type { AssessmentTerm } from "@/models/experimental-report/transforms"
import type { AntibodyRow } from "./types"

export type AssessmentTerms = { validationMethods: AssessmentTerm[]; stainingIssues: AssessmentTerm[] }

const RECOMMENDATIONS = Object.keys(RECOMMENDATION_LABELS) as Recommendation[]
const VALIDATION_RESULTS = Object.keys(VALIDATION_RESULT_LABELS) as ValidationResult[]

const RESULT_ON_STYLES: Record<ValidationResult, string> = {
  SUPPORTS: "data-[state=on]:border-success/40 data-[state=on]:bg-success/10 data-[state=on]:text-success",
  CONTRADICTS:
    "data-[state=on]:border-destructive/40 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive",
  INCONCLUSIVE: "data-[state=on]:bg-muted",
}

const RECOMMENDATION_ON_STYLES: Record<Recommendation, string> = {
  RECOMMENDED: "data-[state=on]:border-success/40 data-[state=on]:bg-success/10 data-[state=on]:text-success",
  WITH_CAVEATS: "data-[state=on]:border-warning/40 data-[state=on]:bg-warning/10 data-[state=on]:text-warning",
  NOT_RECOMMENDED:
    "data-[state=on]:border-destructive/40 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive",
}

export function AssessmentFields({
  row,
  terms,
  onChange,
}: {
  row: AntibodyRow
  terms: AssessmentTerms
  onChange: (patch: Partial<AntibodyRow>) => void
}) {
  function setValidation(methodId: string, result: string) {
    const validations = { ...row.validations }
    if (result) validations[methodId] = result as ValidationResult
    else delete validations[methodId]
    onChange({ validations })
  }

  return (
    <div className="space-y-4 border-t pt-3">
      <Field label="Verdict" hint="Would you use this antibody again for this tissue, preservation and method?">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Verdict"
          className="flex-wrap"
          value={row.recommendation}
          onValueChange={(recommendation) => onChange({ recommendation: recommendation as Recommendation | "" })}
        >
          {RECOMMENDATIONS.map((recommendation) => (
            <ToggleGroupItem
              key={recommendation}
              value={recommendation}
              className={RECOMMENDATION_ON_STYLES[recommendation]}
            >
              {RECOMMENDATION_LABELS[recommendation]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field label="Issues" hint="Pick anything that limited the stain. Leave empty if there were none.">
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          aria-label="Issues"
          className="flex-wrap"
          value={row.issueIds}
          onValueChange={(issueIds) => onChange({ issueIds })}
        >
          {terms.stainingIssues.map((issue) => (
            <ToggleGroupItem
              key={issue.id}
              value={issue.id}
              title={issue.description ?? undefined}
              className="data-[state=on]:border-warning/40 data-[state=on]:bg-warning/10 data-[state=on]:text-warning"
            >
              {issue.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field
        label="Specificity controls"
        hint="Mark the controls you ran and what they showed. Leave the others empty."
      >
        <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2">
          {terms.validationMethods.map((method) => (
            <div key={method.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm">{method.label}</p>
                {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                aria-label={method.label}
                className="shrink-0"
                value={row.validations[method.id] ?? ""}
                onValueChange={(result) => setValidation(method.id, result)}
              >
                {VALIDATION_RESULTS.map((result) => (
                  <ToggleGroupItem key={result} value={result} className={cn("text-xs", RESULT_ON_STYLES[result])}>
                    {VALIDATION_RESULT_LABELS[result]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ))}
        </div>
      </Field>
    </div>
  )
}
