"use client"

import { OntologySearch, type OntologyType, type OntologyValue } from "@/components/ontology-combobox"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export type { OntologyValue }

interface OntologyMultiComboboxProps {
  id?: string
  ontologyType: OntologyType
  values: OntologyValue[]
  onChange: (values: OntologyValue[]) => void
  placeholder?: string
  disabled?: boolean
}

export function OntologyMultiCombobox({
  id,
  ontologyType,
  values,
  onChange,
  placeholder = "Search…",
  disabled = false,
}: OntologyMultiComboboxProps) {
  const selectedIds = new Set(values.map((v) => v.id))

  function remove(valueId: string) {
    onChange(values.filter((v) => v.id !== valueId))
  }

  return (
    <div className="space-y-2">
      <OntologySearch
        id={id}
        ontologyType={ontologyType}
        placeholder={placeholder}
        disabled={disabled}
        closeOnSelect={false}
        triggerLabel={values.length > 0 ? `${values.length} selected` : null}
        isSelected={(resultId) => selectedIds.has(resultId)}
        onSelect={(result) =>
          selectedIds.has(result.id) ? remove(result.id) : onChange([...values, { id: result.id, label: result.label }])
        }
      />

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v.id} variant="secondary" className="gap-1 pr-1">
              {v.label}
              <button
                type="button"
                onClick={() => remove(v.id)}
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
