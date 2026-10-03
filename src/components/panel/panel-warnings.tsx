"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, Info, XCircle } from "lucide-react"

export type PanelWarning = {
  type: string
  severity: "info" | "warning" | "error"
  cycleId?: string
  markers?: string[]
  message: string
}

const SEVERITY_LABELS = { error: "Error", warning: "Warning", info: "Note" } as const

const SEVERITY_ICONS = { error: XCircle, warning: AlertTriangle, info: Info } as const

const SEVERITY_CLASSES = {
  error: "border border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border border-warning/30 bg-warning/10 text-warning",
  info: "border border-primary/20 bg-primary/10 text-primary",
} as const

export function PanelWarnings({ warnings }: { warnings: PanelWarning[] }) {
  return (
    <div className="px-4 empty:hidden" aria-live="polite">
      {warnings.length > 0 && (
        <div className="space-y-1.5 pt-4">
          {warnings.map((w, i) => {
            const Icon = SEVERITY_ICONS[w.severity]
            return (
              <div
                key={`${w.type}-${w.cycleId ?? "panel"}-${i}`}
                className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-xs", SEVERITY_CLASSES[w.severity])}
              >
                <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium">{SEVERITY_LABELS[w.severity]}:</span> {w.message}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
