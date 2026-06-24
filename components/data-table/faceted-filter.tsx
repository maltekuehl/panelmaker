"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, PlusCircle } from "lucide-react"

interface FacetedFilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface DataTableFacetedFilterProps {
  title: string
  options: FacetedFilterOption[]
  value: string[]
  onChange: (value: string[]) => void
}

export function DataTableFacetedFilter({ title, options, value, onChange }: DataTableFacetedFilterProps) {
  const selected = new Set(value)

  const toggle = (optionValue: string) => {
    const next = new Set(selected)
    if (next.has(optionValue)) {
      next.delete(optionValue)
    } else {
      next.add(optionValue)
    }
    onChange(Array.from(next))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="h-4 w-4" />
          {title}
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
                  options
                    .filter((option) => selected.has(option.value))
                    .map((option) => (
                      <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="p-1">
          {options.map((option) => {
            const isSelected = selected.has(option.value)
            return (
              <div
                key={option.value}
                role="button"
                tabIndex={0}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
                onClick={() => toggle(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    toggle(option.value)
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
                {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                <span>{option.label}</span>
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
                onClick={() => onChange([])}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onChange([])
                  }
                }}
              >
                Clear filter
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
