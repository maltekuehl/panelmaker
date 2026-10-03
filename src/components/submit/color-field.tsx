"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const OTHER_DISPLAY_COLOR = "other"

const NOT_STATED = "unset"

export const DISPLAY_COLORS: { value: string; name: string }[] = [
  { value: "#ff0000", name: "Red" },
  { value: "#00ff00", name: "Green" },
  { value: "#0000ff", name: "Blue" },
  { value: "#00ffff", name: "Cyan" },
  { value: "#ff00ff", name: "Magenta" },
  { value: "#ffff00", name: "Yellow" },
  { value: "#ffffff", name: "White" },
]

// An optional display colour. Empty means "not stated" and stays empty: nothing is derived from the
// fluorophore.
export function ColorField({
  id,
  value,
  onChange,
  label,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <Select value={value || NOT_STATED} onValueChange={(next) => onChange(next === NOT_STATED ? "" : next)}>
      <SelectTrigger id={id} className="w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NOT_STATED}>
          <span className="text-muted-foreground">Not stated</span>
        </SelectItem>
        {DISPLAY_COLORS.map((color) => (
          <SelectItem key={color.value} value={color.value}>
            <span className="size-3 shrink-0 rounded-full border" style={{ backgroundColor: color.value }} />
            {color.name}
          </SelectItem>
        ))}
        <SelectItem value={OTHER_DISPLAY_COLOR}>Other</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function displayColorName(value: string): string | null {
  if (value === OTHER_DISPLAY_COLOR) return "Other"
  return DISPLAY_COLORS.find((c) => c.value === value)?.name ?? null
}
