"use client"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type OntologyType = "cl" | "uberon" | "ncbi_taxonomy" | "go_cc" | "doid"

interface OntologyValue {
  id: string
  label: string
}

interface OntologyComboboxProps {
  ontologyType: OntologyType
  value?: OntologyValue | null
  onChange: (value: OntologyValue | null) => void
  placeholder?: string
  disabled?: boolean
}

interface OntologyResult {
  id: string
  label: string
  description?: string
  ontology: string
}

export function OntologyCombobox({
  ontologyType,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
}: OntologyComboboxProps) {
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

  function handleSelect(result: OntologyResult) {
    onChange({ id: result.id, label: result.label })
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className={cn(!value && "text-muted-foreground")}>{value ? value.label : placeholder}</span>
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
                    onSelect={() => handleSelect(result)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center gap-2">
                      <Check
                        className={cn("h-4 w-4 shrink-0", value?.id === result.id ? "opacity-100" : "opacity-0")}
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
  )
}
