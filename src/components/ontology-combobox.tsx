"use client"

import { ComboboxTrigger, SearchCombobox, SelectionCheck } from "@/components/search-combobox"
import type { OntologyResult, OntologyType } from "@/lib/ontology"

export type { OntologyType }

export type OntologyValue = Pick<OntologyResult, "id" | "label">

interface OntologySearchProps {
  id?: string
  ontologyType: OntologyType
  placeholder: string
  disabled: boolean
  closeOnSelect: boolean
  triggerLabel: string | null
  isSelected: (id: string) => boolean
  onSelect: (result: OntologyResult) => void
}

export function OntologySearch({
  id,
  ontologyType,
  placeholder,
  disabled,
  closeOnSelect,
  triggerLabel,
  isSelected,
  onSelect,
}: OntologySearchProps) {
  return (
    <SearchCombobox<OntologyResult>
      endpoint="/api/ontology"
      params={{ type: ontologyType }}
      resultsKey="results"
      disabled={disabled}
      placeholder={placeholder}
      contentLabel={placeholder}
      emptyText="No results found."
      closeOnSelect={closeOnSelect}
      getKey={(result) => result.id}
      onSelect={onSelect}
      trigger={(open) => (
        <ComboboxTrigger
          id={id}
          open={open}
          disabled={disabled}
          label={triggerLabel ?? placeholder}
          isPlaceholder={triggerLabel === null}
        />
      )}
      renderItem={(result) => (
        <>
          <div className="flex w-full items-center gap-2">
            <SelectionCheck selected={isSelected(result.id)} />
            <span className="font-medium">{result.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">{result.id}</span>
          </div>
          {result.description && (
            <span className="pl-6 text-xs text-muted-foreground line-clamp-1">{result.description}</span>
          )}
        </>
      )}
    />
  )
}

interface OntologyComboboxProps {
  id?: string
  ontologyType: OntologyType
  value?: OntologyValue | null
  onChange: (value: OntologyValue | null) => void
  placeholder?: string
  disabled?: boolean
}

export function OntologyCombobox({
  id,
  ontologyType,
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
}: OntologyComboboxProps) {
  return (
    <OntologySearch
      id={id}
      ontologyType={ontologyType}
      placeholder={placeholder}
      disabled={disabled}
      closeOnSelect
      triggerLabel={value?.label ?? null}
      isSelected={(resultId) => value?.id === resultId}
      onSelect={(result) => onChange({ id: result.id, label: result.label })}
    />
  )
}
