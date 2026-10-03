"use client"

import type { OntologyValue } from "@/components/ontology-combobox"
import { ComboboxTrigger, SearchCombobox, SelectionCheck } from "@/components/search-combobox"

export interface AntibodyRegistryValue {
  name: string
  citation: string
  vendor: string
  catalogNumber: string
  clonality: string
  cloneId: string
  target: string
  sourceOrganism: string
  conjugate: string
  isotype: string
  targetSpecies: string[]
  applications: string[]
  url: string
}

export async function lookupHostSpecies(sourceOrganism: string): Promise<OntologyValue | null> {
  try {
    const res = await fetch(`/api/ontology?type=ncbi_taxonomy&q=${encodeURIComponent(sourceOrganism)}&limit=1`)
    if (!res.ok) return null
    const match: OntologyValue | undefined = (await res.json()).results?.[0]
    return match ? { id: match.id, label: match.label } : null
  } catch {
    return null
  }
}

interface AntibodyRegistryComboboxProps {
  id?: string
  value?: AntibodyRegistryValue | null
  onChange: (value: AntibodyRegistryValue | null) => void
  placeholder?: string
}

export function AntibodyRegistryCombobox({
  id,
  value,
  onChange,
  placeholder = "Search antibody by name, RRID, or target…",
}: AntibodyRegistryComboboxProps) {
  const displayLabel = value ? `${value.name}${value.citation ? ` (${value.citation})` : ""}` : null

  return (
    <SearchCombobox<AntibodyRegistryValue>
      endpoint="/api/antibody-registry"
      resultsKey="results"
      placeholder={placeholder}
      contentLabel="Antibody registry results"
      heading="Antibody Registry"
      emptyText="No antibodies found."
      getKey={(result, index) => `${result.citation}-${index}`}
      onSelect={onChange}
      trigger={(open) => (
        <ComboboxTrigger
          id={id}
          open={open}
          label={displayLabel ?? placeholder}
          isPlaceholder={displayLabel === null}
          truncate
        />
      )}
      renderItem={(result) => (
        <>
          <div className="flex w-full items-center gap-2">
            <SelectionCheck selected={value?.citation === result.citation} />
            <span className="font-medium truncate">{result.name}</span>
            {result.citation && (
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{result.citation}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 pl-6 text-xs text-muted-foreground">
            {[result.vendor, result.catalogNumber, result.clonality, result.sourceOrganism]
              .filter(Boolean)
              .map((part) => (
                <span key={part}>{part}</span>
              ))}
          </div>
        </>
      )}
    />
  )
}
