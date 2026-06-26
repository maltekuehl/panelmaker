"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, PlusCircle } from "lucide-react"

type Visibility = "PRIVATE" | "LAB" | "PUBLIC"

interface VisibilityValue {
  visibility: Visibility
  sharedLabIds: string[]
}

interface VisibilitySelectorProps {
  value: VisibilityValue
  onChange: (next: VisibilityValue) => void
  labs: { id: string; name: string }[]
  disabled?: boolean
}

const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: "Private",
  LAB: "Lab",
  PUBLIC: "Public",
}

const VISIBILITY_DESCRIPTIONS: Record<Visibility, string> = {
  PRIVATE: "Only visible to you.",
  LAB: "Shared with selected labs.",
  PUBLIC: "Visible to everyone.",
}

export function VisibilitySelector({ value, onChange, labs, disabled }: VisibilitySelectorProps) {
  const hasLabs = labs.length > 0
  const selected = new Set(value.sharedLabIds)

  const handleVisibilityChange = (next: string) => {
    const visibility = next as Visibility
    onChange({
      visibility,
      sharedLabIds: visibility === "LAB" ? value.sharedLabIds : [],
    })
  }

  const toggleLab = (labId: string) => {
    const next = new Set(selected)
    if (next.has(labId)) {
      next.delete(labId)
    } else {
      next.add(labId)
    }
    onChange({ ...value, sharedLabIds: Array.from(next) })
  }

  return (
    <div className="space-y-2">
      <Label>Visibility</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={value.visibility} onValueChange={handleVisibilityChange} disabled={disabled}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PRIVATE">{VISIBILITY_LABELS.PRIVATE}</SelectItem>
            {hasLabs && <SelectItem value="LAB">{VISIBILITY_LABELS.LAB}</SelectItem>}
            <SelectItem value="PUBLIC">{VISIBILITY_LABELS.PUBLIC}</SelectItem>
          </SelectContent>
        </Select>

        {value.visibility === "LAB" && hasLabs && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed" disabled={disabled}>
                <PlusCircle className="size-4" />
                Labs
                {selected.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                      {selected.size}
                    </Badge>
                    <div className="hidden space-x-1 lg:flex">
                      {selected.size > 2 ? (
                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                          {selected.size} selected
                        </Badge>
                      ) : (
                        labs
                          .filter((lab) => selected.has(lab.id))
                          .map((lab) => (
                            <Badge variant="secondary" key={lab.id} className="rounded-sm px-1 font-normal">
                              {lab.name}
                            </Badge>
                          ))
                      )}
                    </div>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-[220px] max-w-[420px] p-0" align="start">
              <div className="p-1">
                {labs.map((lab) => {
                  const isSelected = selected.has(lab.id)
                  return (
                    <div
                      key={lab.id}
                      role="button"
                      tabIndex={0}
                      className="relative flex cursor-pointer select-none items-center whitespace-nowrap rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
                      onClick={() => toggleLab(lab.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          toggleLab(lab.id)
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{lab.name}</span>
                    </div>
                  )
                })}
                {selected.size > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex cursor-pointer select-none items-center justify-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
                      onClick={() => onChange({ ...value, sharedLabIds: [] })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onChange({ ...value, sharedLabIds: [] })
                        }
                      }}
                    >
                      Clear selection
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{VISIBILITY_DESCRIPTIONS[value.visibility]}</p>
    </div>
  )
}
