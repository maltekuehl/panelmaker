"use client"

import { ComboboxTrigger, SearchCombobox, SelectionCheck } from "@/components/search-combobox"
import type { ProteinValue } from "./types"

export function ProteinCombobox({
  id,
  value,
  onChange,
  organismId,
  disabled = false,
  className,
}: {
  id?: string
  value?: ProteinValue | null
  onChange: (value: ProteinValue | null) => void
  organismId?: number
  disabled?: boolean
  className?: string
}) {
  return (
    <SearchCombobox<ProteinValue>
      endpoint="/api/proteins"
      params={{ limit: "10", organismId: organismId ? String(organismId) : undefined }}
      resultsKey="proteins"
      disabled={disabled}
      placeholder="Type to search (e.g. CD3, Ki67)…"
      heading="Proteins"
      emptyText="No proteins found."
      hintText="Type at least 2 characters."
      getKey={(protein) => protein.id}
      onSelect={(protein) => onChange({ id: protein.id, label: protein.label, geneSymbol: protein.geneSymbol })}
      itemClassName=""
      trigger={(open) => (
        <ComboboxTrigger
          id={id}
          open={open}
          disabled={disabled}
          className={className}
          label={
            value ? `${value.label}${value.geneSymbol ? ` (${value.geneSymbol})` : ""}` : "Search UniProt proteins…"
          }
          isPlaceholder={!value}
          truncate
        />
      )}
      renderItem={(protein) => (
        <>
          <SelectionCheck selected={value?.id === protein.id} className="mr-2" />
          <div className="flex flex-col">
            <span className="font-medium">{protein.label}</span>
            {protein.geneSymbol && (
              <span className="flex gap-x-2 text-xs text-muted-foreground">
                <span>{protein.geneSymbol}</span>
                <span>{protein.id}</span>
              </span>
            )}
          </div>
        </>
      )}
    />
  )
}
