import { cn } from "@/lib/utils"

// Imported records (IBEX, later OMAP) and sparse submissions leave many optional fields empty. An empty
// cell reads as a rendering bug, so every missing value says so explicitly instead.
export function NotAvailable({ className }: { className?: string }) {
  return (
    <span className={cn("text-muted-foreground/60 italic", className)} title="Not provided by the source record">
      Not available
    </span>
  )
}

// Renders the value, or the placeholder when it is null, undefined or blank.
export function ValueOrNotAvailable({
  value,
  className,
}: {
  value: string | number | null | undefined
  className?: string
}) {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return <NotAvailable />
  }
  return <span className={className}>{value}</span>
}
