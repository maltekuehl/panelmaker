import { NotAvailable } from "@/components/shared/not-available"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RECOMMENDATION_LABELS, VALIDATION_RESULT_LABELS } from "@/lib/constants"
import type { Recommendation, ValidationResult } from "@/lib/generated/prisma/enums"
import { cn } from "@/lib/utils"
import type { ReportIssueEntry, ReportValidationEntry } from "@/models/experimental-report/transforms"

const POSITIVE = "border-success/20 bg-success/10 text-success"
const NEGATIVE = "border-destructive/20 bg-destructive/10 text-destructive"
const NEUTRAL = "border-warning/20 bg-warning/10 text-warning"

const RECOMMENDATION_STYLES: Record<Recommendation, string> = {
  RECOMMENDED: POSITIVE,
  WITH_CAVEATS: NEUTRAL,
  NOT_RECOMMENDED: NEGATIVE,
}

const VALIDATION_RESULT_STYLES: Record<ValidationResult, string> = {
  SUPPORTS: "text-success",
  CONTRADICTS: "text-destructive",
  INCONCLUSIVE: "text-muted-foreground",
}

export function RecommendationBadge({
  recommendation,
  className,
}: {
  recommendation: Recommendation | null
  className?: string
}) {
  if (!recommendation)
    return (
      <Badge variant="outline" className={className}>
        No verdict
      </Badge>
    )
  return (
    <Badge className={cn(RECOMMENDATION_STYLES[recommendation], className)}>
      {RECOMMENDATION_LABELS[recommendation]}
    </Badge>
  )
}

export function IssueBadges({ issues }: { issues: ReportIssueEntry[] }) {
  if (issues.length === 0) return <NotAvailable />
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((issue) => (
        <Badge key={issue.id} variant="outline" className="font-normal">
          {issue.label}
        </Badge>
      ))}
    </div>
  )
}

export function ValidationList({ validations }: { validations: ReportValidationEntry[] }) {
  if (validations.length === 0) return <NotAvailable />
  return (
    <ul className="space-y-0.5">
      {validations.map((validation) => (
        <li key={validation.id} className="flex flex-wrap items-baseline gap-x-2">
          <span>{validation.label}</span>
          <span className={cn("text-xs font-medium", VALIDATION_RESULT_STYLES[validation.result])}>
            {VALIDATION_RESULT_LABELS[validation.result]}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ValidationCount({ validations }: { validations: ReportValidationEntry[] }) {
  const supporting = validations.filter((validation) => validation.result === "SUPPORTS")
  if (supporting.length === 0) return <NotAvailable />
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="cursor-default">
          {supporting.length} {supporting.length === 1 ? "control" : "controls"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <ul>
          {supporting.map((validation) => (
            <li key={validation.id}>{validation.label}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
