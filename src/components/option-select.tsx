"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface OptionSelectProps<T extends string> {
  "id"?: string
  "value": T | "" | undefined
  "onValueChange": (value: T) => void
  "options": readonly { value: T; label: string }[]
  "placeholder"?: string
  "className"?: string
  "aria-label"?: string
}

export function OptionSelect<T extends string>({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: OptionSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
