"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebouncedSearch, type SearchParams } from "@/hooks/use-debounced-search"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useState, type ReactNode } from "react"

interface SearchComboboxProps<T> {
  endpoint: string
  params?: SearchParams
  resultsKey: string
  minLength?: number
  trigger: (open: boolean) => ReactNode
  disabled?: boolean
  placeholder: string
  contentLabel?: string
  contentClassName?: string
  heading?: string
  emptyText: string
  hintText?: string
  closeOnSelect?: boolean
  getKey: (item: T, index: number) => string
  onSelect: (item: T) => void
  renderItem: (item: T) => ReactNode
  itemClassName?: string
}

export function SearchCombobox<T>({
  endpoint,
  params,
  resultsKey,
  minLength = 2,
  trigger,
  disabled = false,
  placeholder,
  contentLabel,
  contentClassName = "w-(--radix-popover-trigger-width)",
  heading,
  emptyText,
  hintText = "Type at least 2 characters to search.",
  closeOnSelect = true,
  getKey,
  onSelect,
  renderItem,
  itemClassName = "flex flex-col items-start gap-0.5",
}: SearchComboboxProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const isOpen = !disabled && open

  const { results, isLoading } = useDebouncedSearch<T>({
    endpoint,
    params,
    resultsKey,
    query,
    enabled: isOpen,
    minLength,
  })
  const hasMinLength = query.trim().length >= minLength

  function handleSelect(item: T) {
    onSelect(item)
    if (!closeOnSelect) return
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={isOpen} onOpenChange={disabled ? undefined : setOpen} modal>
      <PopoverTrigger asChild>{trigger(isOpen)}</PopoverTrigger>
      <PopoverContent aria-label={contentLabel} className={cn("p-0", contentClassName)} align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && hasMinLength && results.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            {!isLoading && !hasMinLength && <CommandEmpty>{hintText}</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading={heading}>
                {results.map((item, index) => {
                  const key = getKey(item, index)
                  return (
                    <CommandItem key={key} value={key} onSelect={() => handleSelect(item)} className={itemClassName}>
                      {renderItem(item)}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface ComboboxTriggerProps {
  id?: string
  open: boolean
  disabled?: boolean
  label: ReactNode
  isPlaceholder: boolean
  truncate?: boolean
  className?: string
}

export function ComboboxTrigger({
  id,
  open,
  disabled,
  label,
  isPlaceholder,
  truncate = false,
  className,
}: ComboboxTriggerProps) {
  return (
    <Button
      id={id}
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn("w-full justify-between font-normal", className)}
      disabled={disabled}
    >
      <span className={cn(truncate && "truncate", isPlaceholder && "text-muted-foreground")}>{label}</span>
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
    </Button>
  )
}

export function SelectionCheck({ selected, className }: { selected: boolean; className?: string }) {
  return <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0", className)} />
}
