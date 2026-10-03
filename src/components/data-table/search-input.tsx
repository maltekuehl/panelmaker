"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

const SEARCH_DEBOUNCE_MS = 300

interface DebouncedSearchInputProps {
  "value": string
  "onCommit": (value: string) => void
  "placeholder"?: string
  "className"?: string
  "aria-label"?: string
  "debounceMs"?: number
}

export function DebouncedSearchInput({
  value,
  onCommit,
  placeholder,
  className,
  debounceMs = SEARCH_DEBOUNCE_MS,
  ...props
}: DebouncedSearchInputProps) {
  const [search, setSearch] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const onChange = (next: string) => {
    setSearch(next)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommit(next), debounceMs)
  }

  return (
    <Input
      type="search"
      placeholder={placeholder}
      aria-label={props["aria-label"] ?? placeholder}
      value={search}
      onChange={(event) => onChange(event.target.value)}
      className={cn("h-9", className)}
    />
  )
}
