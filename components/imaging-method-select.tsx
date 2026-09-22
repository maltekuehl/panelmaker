"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2, Microscope, X } from "lucide-react"
import { useEffect, useState } from "react"

export type ImagingMethodOption = {
  id: string
  label: string
  shortLabel: string
  efoId: string | null
  detection: "FLUORESCENCE" | "MASS" | "OTHER"
  cyclic: boolean
  aliases: string[]
}

let cache: ImagingMethodOption[] | null = null

export function useImagingMethods() {
  const [imagingMethods, setImagingMethods] = useState<ImagingMethodOption[]>(cache ?? [])
  const [loading, setLoading] = useState(cache === null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (cache !== null) return
    let active = true
    fetch("/api/imaging-methods")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed")
        return res.json()
      })
      .then((json) => {
        // Only a successful response is cached, so a remount retries after a failure.
        cache = (json.imagingMethods ?? []) as ImagingMethodOption[]
        if (active) setImagingMethods(cache)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { imagingMethods, loading, error }
}

const DETECTION_LABELS: Record<ImagingMethodOption["detection"], string> = {
  FLUORESCENCE: "Fluorescence",
  MASS: "Metal tag",
  OTHER: "Other",
}

interface ImagingMethodSelectProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  pending?: boolean
  disabled?: boolean
  allowClear?: boolean
  className?: string
}

export function ImagingMethodSelect({
  id,
  value,
  onChange,
  pending = false,
  disabled = false,
  allowClear = true,
  className,
}: ImagingMethodSelectProps) {
  const [open, setOpen] = useState(false)
  const { imagingMethods, loading, error } = useImagingMethods()

  const selected = imagingMethods.find((method) => method.id === value) ?? null

  function select(next: string | null) {
    setOpen(false)
    onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled || pending}
          title={selected?.label}
        >
          <span className={cn("flex min-w-0 items-center gap-2", !selected && "text-muted-foreground")}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Microscope className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{selected?.shortLabel ?? value ?? "Select imaging method"}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Imaging methods" className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search imaging method" />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading methods" : error ? "Could not load imaging methods" : "No imaging method found."}
            </CommandEmpty>
            <CommandGroup>
              {imagingMethods.map((method) => (
                <CommandItem
                  key={method.id}
                  value={`${method.label} ${method.aliases.join(" ")} ${method.efoId ?? ""}`}
                  onSelect={() => select(method.id)}
                  className="flex items-start gap-2"
                >
                  <Check className={cn("mt-0.5 h-3 w-3 shrink-0", value === method.id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{method.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {[
                        DETECTION_LABELS[method.detection],
                        method.cyclic ? "Cyclic" : null,
                        method.efoId ?? "No ontology term",
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  </span>
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
                  <span className="text-xs">Clear imaging method</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
