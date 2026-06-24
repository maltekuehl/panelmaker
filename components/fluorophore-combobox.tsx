"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2, Waves, X } from "lucide-react"
import { useEffect, useState } from "react"

export type FluorophoreOption = {
  id: string
  name: string
  excitation: number
  emission: number
}

let cache: FluorophoreOption[] | null = null

export function useFluorophores() {
  const [fluorophores, setFluorophores] = useState<FluorophoreOption[]>(cache ?? [])
  const [loading, setLoading] = useState(cache === null)

  useEffect(() => {
    if (cache !== null) return
    let active = true
    fetch("/api/fluorophores")
      .then((res) => (res.ok ? res.json() : { fluorophores: [] }))
      .then((json) => {
        cache = (json.fluorophores ?? []) as FluorophoreOption[]
        if (active) setFluorophores(cache)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { fluorophores, loading }
}

interface FluorophoreComboboxProps {
  value: FluorophoreOption | null
  onChange: (value: FluorophoreOption | null) => void
  variant?: "inline" | "field"
  pending?: boolean
  disabled?: boolean
  allowClear?: boolean
}

export function FluorophoreCombobox({
  value,
  onChange,
  variant = "field",
  pending = false,
  disabled = false,
  allowClear = true,
}: FluorophoreComboboxProps) {
  const [open, setOpen] = useState(false)
  const { fluorophores, loading } = useFluorophores()

  function select(option: FluorophoreOption | null) {
    setOpen(false)
    onChange(option)
  }

  const trigger =
    variant === "inline" ? (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 text-[11px] leading-none transition-colors",
          value ? "text-muted-foreground hover:text-foreground" : "text-primary hover:text-primary/80 font-medium",
        )}
        disabled={disabled || pending}
      >
        {pending ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <Waves className="h-3 w-3 shrink-0" />}
        {value?.name ?? "Set fluorophore"}
        <ChevronsUpDown className="h-2.5 w-2.5 shrink-0 opacity-50" />
      </button>
    ) : (
      <Button
        variant="outline"
        role="combobox"
        className="mt-1 w-full justify-between font-normal"
        disabled={disabled || pending}
      >
        <span className={cn("flex items-center gap-2", !value && "text-muted-foreground")}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Waves className="h-3.5 w-3.5 shrink-0" />
          )}
          {value?.name ?? "Select fluorophore"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn("p-0", variant === "inline" ? "w-60" : "w-(--radix-popover-trigger-width)")}
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search fluorophore..." />
          <CommandList>
            <CommandEmpty>{loading ? "Loading fluorophores..." : "No fluorophore found."}</CommandEmpty>
            <CommandGroup>
              {fluorophores.map((flu) => (
                <CommandItem
                  key={flu.id}
                  value={`${flu.name} ${flu.emission}`}
                  onSelect={() => select(flu)}
                  className="flex items-center gap-2"
                >
                  <Check className={cn("h-3 w-3 shrink-0", value?.id === flu.id ? "opacity-100" : "opacity-0")} />
                  <span className="text-xs font-medium flex-1">{flu.name}</span>
                  <span className="text-[10px] text-muted-foreground">{flu.emission} nm</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {value && allowClear && (
              <CommandGroup className="border-t">
                <CommandItem
                  value="__clear__"
                  onSelect={() => select(null)}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <X className="h-3 w-3 shrink-0" />
                  <span className="text-xs">Clear fluorophore</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
