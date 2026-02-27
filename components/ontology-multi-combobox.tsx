"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type OntologyType = "cl" | "uberon" | "ncbi_taxonomy" | "go_cc"

export interface OntologyValue {
  id: string
  label: string
}

interface OntologyMultiComboboxProps {
  ontologyType: OntologyType
  values: OntologyValue[]
  onChange: (values: OntologyValue[]) => void
  placeholder?: string
  disabled?: boolean
}

interface OntologyResult {
  id: string
  label: string
  description?: string
  ontology: string
}

export function OntologyMultiCombobox({
  ontologyType,
  values,
  onChange,
  placeholder = "Search...",
  disabled = false,
}: OntologyMultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OntologyResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ontology?type=${ontologyType}&q=${encodeURIComponent(query.trim())}`)
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, ontologyType, open])

  const selectedIds = new Set(values.map((v) => v.id))

  function handleToggle(result: OntologyResult) {
    if (selectedIds.has(result.id)) {
      onChange(values.filter((v) => v.id !== result.id))
    } else {
      onChange([...values, { id: result.id, label: result.label }])
    }
  }

  function handleRemove(id: string) {
    onChange(values.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-2">
      <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span className={cn(!values.length && "text-muted-foreground")}>
              {values.length > 0 ? `${values.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && query.trim().length >= 2 && results.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {!isLoading && query.trim().length < 2 && (
                <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
              )}
              {results.length > 0 && (
                <CommandGroup>
                  {results.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleToggle(result)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <div className="flex w-full items-center gap-2">
                        <Check
                          className={cn("h-4 w-4 shrink-0", selectedIds.has(result.id) ? "opacity-100" : "opacity-0")}
                        />
                        <span className="font-medium">{result.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{result.id}</span>
                      </div>
                      {result.description && (
                        <span className="pl-6 text-xs text-muted-foreground line-clamp-1">{result.description}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v.id} variant="secondary" className="gap-1 pr-1">
              {v.label}
              <button
                type="button"
                onClick={() => handleRemove(v.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {v.label}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
