"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SegmentedTabItem<T extends string> {
  value: T
  label: string
  count?: number
}

interface SegmentedTabsProps<T extends string> {
  items: SegmentedTabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

export function SegmentedTabs<T extends string>({ items, value, onChange, label, className }: SegmentedTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("max-w-full overflow-x-auto rounded-md border bg-muted [scrollbar-width:none]", className)}
    >
      <div className="flex w-max p-0.5">
        {items.map((item) => {
          const selected = value === item.value
          return (
            <Button
              key={item.value}
              variant="ghost"
              size="sm"
              aria-pressed={selected}
              className={cn(
                "h-7 shrink-0 rounded-sm px-3 text-sm font-medium",
                selected
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onChange(item.value)}
            >
              {item.label}
              {item.count !== undefined && <span className="text-xs text-muted-foreground">{item.count}</span>}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
