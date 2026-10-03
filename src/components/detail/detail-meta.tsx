import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function MetaRow({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm", className)}>{children}</div>
}

export function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span>
      <span className="text-muted-foreground">{label}: </span>
      {children}
    </span>
  )
}

export interface GlanceStat {
  label: string
  value: number
}

export function AtAGlance({ stats }: { stats: GlanceStat[] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">At a glance</h3>
      <dl className="space-y-2 text-sm">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <dt className="text-muted-foreground">{stat.label}</dt>
            <dd className="font-medium tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
