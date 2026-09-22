import { NotAvailable } from "@/components/shared/not-available"
import { Badge } from "@/components/ui/badge"
import { SIGNAL_QUALITY_LABELS, SPECIFICITY_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const POSITIVE = "border-success/20 bg-success/10 text-success"
const NEGATIVE = "border-destructive/20 bg-destructive/10 text-destructive"
const NEUTRAL = "border-warning/20 bg-warning/10 text-warning"

const QUALITY_STYLES: Record<string, string> = {
  EXCELLENT: POSITIVE,
  GOOD: "border-primary/20 bg-primary/10 text-primary",
  MODERATE: NEUTRAL,
  POOR: NEGATIVE,
  HIGH: POSITIVE,
  LOW: NEGATIVE,
  NON_SPECIFIC: NEGATIVE,
}

const QUALITY_LABELS: Record<string, string> = { ...SIGNAL_QUALITY_LABELS, ...SPECIFICITY_LABELS }

export function WorksBadge({ works, className }: { works: boolean | null; className?: string }) {
  if (works === null)
    return (
      <Badge variant="outline" className={className}>
        Unknown
      </Badge>
    )
  return <Badge className={cn(works ? POSITIVE : NEGATIVE, className)}>{works ? "Works" : "Failed"}</Badge>
}

export function QualityBadge({ label, className }: { label: string | null; className?: string }) {
  if (!label) return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium",
        QUALITY_STYLES[label] ?? "border-transparent bg-muted text-muted-foreground",
        className,
      )}
    >
      {QUALITY_LABELS[label] ?? label}
    </span>
  )
}

export function SpecificityBadge({ specificity, label }: { specificity: string | null; label?: string }) {
  if (!specificity) return <NotAvailable />
  return (
    <Badge className={QUALITY_STYLES[specificity] ?? "border-transparent bg-muted text-muted-foreground"}>
      {label ?? QUALITY_LABELS[specificity] ?? specificity}
    </Badge>
  )
}
