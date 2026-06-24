"use client"

import { Button } from "@/components/ui/button"
import { browseMarkerParsers } from "@/lib/data-table"
import { cn } from "@/lib/utils"
import { useQueryStates } from "nuqs"

const MODES = [
  { value: "markers", label: "Cell markers" },
  { value: "antibodies", label: "Antibodies" },
  { value: "reports", label: "Reports" },
] as const

type Mode = (typeof MODES)[number]["value"]

export function BrowseModeTabs() {
  const [params, setParams] = useQueryStates(browseMarkerParsers, { shallow: false })
  const current: Mode = params.mode

  return (
    <div className="inline-flex rounded-md border bg-muted p-0.5">
      {MODES.map((m) => (
        <Button
          key={m.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 rounded-sm px-3 text-sm font-medium",
            current === m.value
              ? "bg-background text-foreground shadow-sm hover:bg-background"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setParams({ mode: m.value, page: 1 })}
        >
          {m.label}
        </Button>
      ))}
    </div>
  )
}
