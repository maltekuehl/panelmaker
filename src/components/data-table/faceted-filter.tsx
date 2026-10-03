"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, PlusCircle, X } from "lucide-react"

interface FacetedFilterOption {
  label: string
  value: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface DataTableFacetedFilterProps {
  title: string
  options: FacetedFilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function DataTableFacetedFilter({ title, options, value, onChange, className }: DataTableFacetedFilterProps) {
  const selected = new Set(value)

  const sortedOptions = [
    ...options.filter((option) => selected.has(option.value)),
    ...options.filter((option) => !selected.has(option.value)),
  ]

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
        <Button variant="outline" size="sm" className={cn("h-8 min-w-0 border-dashed", className)}>
          <PlusCircle className="h-4 w-4" />
          <span className="truncate">{title}</span>
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selected.size}
              </Badge>
              <div className="hidden min-w-0 space-x-1 overflow-hidden lg:flex">
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
      <PopoverContent
        aria-label={`Filter by ${title}`}
        className="w-[360px] max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}`} />
          {selected.size > 0 && (
            <div className="flex items-center justify-between border-b py-1 pr-1 pl-3">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
                <X className="size-3.5" />
                Clear
              </Button>
            </div>
          )}
          <CommandList>
            <CommandEmpty>No matching {title.toLowerCase()} in the data.</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => {
                const isSelected = selected.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label, option.description ?? ""]}
                    onSelect={() => toggle(option.value)}
                    className="gap-0 [&>svg:last-child]:hidden"
                  >
                    <div
                      className={cn(
                        "mr-2 flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="size-4" />
                    </div>
                    {option.icon && <option.icon className="mr-2 size-4 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.description && option.description !== option.label && (
                      <span className="shrink-0 pl-3 text-right font-mono text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
