"use client"

import { OntologyCombobox, type OntologyValue } from "@/components/ontology-combobox"
import { Label } from "@/components/ui/label"

interface InstitutionFieldProps {
  id: string
  value: OntologyValue | null
  onChange: (value: OntologyValue | null) => void
}

export function InstitutionField({ id, value, onChange }: InstitutionFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium">
        Institution
      </Label>
      <p className="text-xs text-muted-foreground mb-1">
        Search by institution name. Powered by the{" "}
        <a href="https://ror.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Research Organization Registry
        </a>
        .
      </p>
      <div className="max-w-md">
        <OntologyCombobox
          id={id}
          ontologyType="ror"
          value={value}
          onChange={onChange}
          placeholder="Search institution…"
        />
      </div>
    </div>
  )
}
