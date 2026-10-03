"use client"

import { SearchCombobox } from "@/components/search-combobox"
import { Button } from "@/components/ui/button"
import { FlaskConical } from "lucide-react"

export interface LabInventoryImportItem {
  id: string
  labName: string
  rrid: string | null
  name: string
  vendorName: string | null
  catalogNumber: string | null
  cloneId: string | null
  targetName: string | null
  targetProtein: { id: string; label: string; geneSymbol: string | null } | null
  hostTaxon: { id: string; label: string } | null
}

export function LabInventoryCombobox({ onImport }: { onImport: (item: LabInventoryImportItem) => void }) {
  return (
    <SearchCombobox<LabInventoryImportItem>
      endpoint="/api/labs/inventory/mine"
      resultsKey="items"
      minLength={0}
      placeholder="Search your lab inventory…"
      contentClassName="w-[340px]"
      heading="Lab inventory"
      emptyText="No antibodies stocked in your labs."
      getKey={(item) => item.id}
      onSelect={onImport}
      trigger={() => (
        <Button type="button" variant="outline">
          <FlaskConical className="size-4" />
          Import from lab
        </Button>
      )}
      renderItem={(item) => (
        <>
          <div className="flex w-full items-center gap-2">
            <span className="truncate font-medium">{item.name}</span>
            {item.rrid && <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{item.rrid}</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {[item.labName, item.targetProtein?.geneSymbol ?? item.targetName, item.hostTaxon?.label]
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
