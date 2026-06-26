"use client"

import { AntibodyRegistryCombobox } from "@/components/antibody-registry-combobox"
import { FluorophoreCombobox } from "@/components/fluorophore-combobox"
import { OntologyCombobox } from "@/components/ontology-combobox"
import { OntologyMultiCombobox } from "@/components/ontology-multi-combobox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MultiplexMethod } from "@/lib/generated/prisma/enums"
import { cn } from "@/lib/utils"
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { ImageUpload } from "./image-upload"
import { LabInventoryCombobox, type LabInventoryImportItem } from "./lab-inventory-combobox"
import { ProteinCombobox } from "./protein-combobox"
import {
  duplicateRow,
  emptyRow,
  methodNeedsCycle,
  methodNeedsFluorophore,
  methodNeedsMetal,
  type AntibodyRow,
} from "./types"

const WORKS_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
]
const QUALITY_OPTIONS = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "MODERATE", label: "Moderate" },
  { value: "POOR", label: "Poor" },
  { value: "NONE", label: "None" },
]
const SPECIFICITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "MODERATE", label: "Moderate" },
  { value: "LOW", label: "Low" },
  { value: "NON_SPECIFIC", label: "Non-specific" },
]

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

function ResultSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AntibodyEditor({
  row,
  onChange,
  method,
  organismId,
  invalid,
  hasLabs,
}: {
  row: AntibodyRow
  onChange: (patch: Partial<AntibodyRow> | ((r: AntibodyRow) => AntibodyRow)) => void
  method: MultiplexMethod | ""
  organismId?: number
  invalid: (field: keyof AntibodyRow) => boolean
  hasLabs?: boolean
}) {
  // Pre-fill the row from an antibody already stocked in one of the user's labs. Resolves by RRID on
  // submit, so the existing global Antibody (and its captured host species) is reused.
  function handleImport(item: LabInventoryImportItem) {
    onChange((r) => ({
      ...r,
      rrid: item.rrid || r.rrid,
      antibodyVendor: item.vendorName || r.antibodyVendor,
      catalogNumber: item.catalogNumber || r.catalogNumber,
      cloneId: item.cloneId || r.cloneId,
      markerName: item.targetName || item.targetProtein?.geneSymbol || r.markerName,
      markerProtein: item.targetProtein
        ? { id: item.targetProtein.id, label: item.targetProtein.label, geneSymbol: item.targetProtein.geneSymbol }
        : r.markerProtein,
      hostSpecies: item.hostTaxon ? { id: item.hostTaxon.id, label: item.hostTaxon.label } : r.hostSpecies,
    }))
  }

  async function handleRegistry(value: AntibodyRow["antibodyRegistry"]) {
    if (!value) {
      onChange((r) => ({
        ...r,
        antibodyRegistry: null,
        antibodyVendor: "",
        catalogNumber: "",
        cloneId: "",
        rrid: "",
        hostSpecies: null,
      }))
      return
    }

    onChange((r) => ({
      ...r,
      antibodyRegistry: value,
      antibodyVendor: value.vendor || r.antibodyVendor,
      catalogNumber: value.catalogNumber || r.catalogNumber,
      cloneId: value.cloneId || r.cloneId,
      rrid: value.citation || r.rrid,
      markerName: value.target || r.markerName,
    }))

    // The registry record has no UniProt id. Resolve the target protein only when it maps cleanly to a
    // single species-correct entry for the experiment organism; otherwise leave it for the user to
    // pick from the (species-constrained) combobox, rather than guess a wrong-species accession.
    if (value.target && organismId) {
      try {
        const res = await fetch(`/api/proteins?organismId=${organismId}&q=${encodeURIComponent(value.target)}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          const proteins: { id: string; label: string; geneSymbol: string | null }[] = data.proteins ?? []
          if (proteins.length === 1) {
            const p = proteins[0]
            onChange((r) => ({ ...r, markerProtein: { id: p.id, label: p.label, geneSymbol: p.geneSymbol ?? null } }))
          }
        }
      } catch {
        // best-effort; the user can pick the marker via the species-constrained combobox
      }
    }

    if (value.sourceOrganism) {
      try {
        const res = await fetch(
          `/api/ontology?type=ncbi_taxonomy&q=${encodeURIComponent(value.sourceOrganism)}&limit=1`,
        )
        if (res.ok) {
          const data = await res.json()
          const match = data.results?.[0]
          if (match) onChange((r) => ({ ...r, hostSpecies: { id: match.id, label: match.label } }))
        }
      } catch {
        // best-effort; host species stays editable
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <AntibodyRegistryCombobox value={row.antibodyRegistry} onChange={handleRegistry} showDetails={false} />
          </div>
          {hasLabs && <LabInventoryCombobox onImport={handleImport} />}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="Vendor">
            <Input value={row.antibodyVendor} onChange={(e) => onChange({ antibodyVendor: e.target.value })} />
          </Field>
          <Field label="Catalog #">
            <Input value={row.catalogNumber} onChange={(e) => onChange({ catalogNumber: e.target.value })} />
          </Field>
          <Field label="Clone ID">
            <Input value={row.cloneId} onChange={(e) => onChange({ cloneId: e.target.value })} />
          </Field>
          <Field label="RRID">
            <Input
              value={row.rrid}
              onChange={(e) => onChange({ rrid: e.target.value })}
              className="font-mono"
              placeholder="AB_302411"
            />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3">
        <Field label="Target protein">
          <ProteinCombobox
            value={row.markerProtein}
            onChange={(protein) =>
              onChange((r) => ({
                ...r,
                markerProtein: protein,
                markerName: protein ? (protein.geneSymbol ?? protein.label) : r.markerName,
              }))
            }
            organismId={organismId}
          />
        </Field>
        <Field label="Marker name" required>
          <Input
            value={row.markerName}
            onChange={(e) => onChange({ markerName: e.target.value })}
            placeholder="CD3e, Ki-67, PanCK"
            aria-invalid={invalid("markerName")}
          />
        </Field>
        <Field label="Host species">
          <OntologyCombobox
            ontologyType="ncbi_taxonomy"
            value={row.hostSpecies}
            onChange={(hostSpecies) => onChange({ hostSpecies })}
            placeholder="Raised in..."
          />
        </Field>
        <Field label="Cell type(s)" className="sm:col-span-3">
          <OntologyMultiCombobox
            ontologyType="cl"
            values={row.cellTypes}
            onChange={(cellTypes) => onChange({ cellTypes })}
            placeholder="Search cell types where staining is observed..."
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3 lg:grid-cols-4">
        <Field label="Dilution">
          <Input value={row.dilution} onChange={(e) => onChange({ dilution: e.target.value })} placeholder="1:100" />
        </Field>
        {methodNeedsFluorophore(method) && (
          <Field label="Fluorophore">
            <FluorophoreCombobox value={row.fluorophore} onChange={(fluorophore) => onChange({ fluorophore })} />
          </Field>
        )}
        {methodNeedsMetal(method) && (
          <Field label="Metal tag">
            <Input value={row.metalTag} onChange={(e) => onChange({ metalTag: e.target.value })} placeholder="141Pr" />
          </Field>
        )}
        {methodNeedsCycle(method) && (
          <Field label="Cycle #">
            <Input
              type="number"
              min={1}
              value={row.cycleNumber}
              onChange={(e) => onChange({ cycleNumber: e.target.value })}
            />
          </Field>
        )}
        <Field label="Incubation">
          <Input
            value={row.incubation}
            onChange={(e) => onChange({ incubation: e.target.value })}
            placeholder="Overnight 4°C"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3 lg:grid-cols-4">
        <Field label="Antibody works">
          <ResultSelect value={row.works} onChange={(works) => onChange({ works })} options={WORKS_OPTIONS} />
        </Field>
        <Field label="Signal quality">
          <ResultSelect
            value={row.signalQuality}
            onChange={(signalQuality) => onChange({ signalQuality })}
            options={QUALITY_OPTIONS}
          />
        </Field>
        <Field label="Specificity">
          <ResultSelect
            value={row.specificity}
            onChange={(specificity) => onChange({ specificity })}
            options={SPECIFICITY_OPTIONS}
          />
        </Field>
        <Field label="Subcellular location">
          <OntologyCombobox
            ontologyType="go_cc"
            value={row.subcellularLocation}
            onChange={(subcellularLocation) => onChange({ subcellularLocation })}
            placeholder="GO component..."
            disabled={row.locationNotDiscernible}
          />
          <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={row.locationNotDiscernible}
              onCheckedChange={(checked) =>
                onChange({
                  locationNotDiscernible: checked === true,
                  subcellularLocation: checked === true ? null : row.subcellularLocation,
                })
              }
            />
            Not discernible
          </label>
        </Field>
      </div>

      <Field label="Images" required className="border-t pt-3">
        <ImageUpload
          value={row.images}
          onChange={(images) => onChange({ images })}
          availableCellTypes={row.cellTypes}
          invalid={invalid("images")}
        />
      </Field>

      <Field label="Additional notes">
        <Textarea
          value={row.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Blocking buffer, troubleshooting tips, anything else worth noting..."
          className="min-h-[60px]"
        />
      </Field>
    </div>
  )
}

function summaryDetection(row: AntibodyRow): string | null {
  return row.fluorophore?.name || row.metalTag || (row.cycleNumber ? `Cycle ${row.cycleNumber}` : null)
}

export function AntibodyAccordion({
  rows,
  onChange,
  method,
  organismId,
  invalid,
  hasLabs,
}: {
  rows: AntibodyRow[]
  onChange: (rows: AntibodyRow[]) => void
  method: MultiplexMethod | ""
  organismId?: number
  invalid: (key: string, field: keyof AntibodyRow) => boolean
  hasLabs?: boolean
}) {
  const [open, setOpen] = useState<string[]>(() => rows.map((r) => r.key))

  function updateRow(key: string, patch: Partial<AntibodyRow> | ((r: AntibodyRow) => AntibodyRow)) {
    onChange(rows.map((r) => (r.key === key ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r)))
  }

  function addRow() {
    const row = emptyRow()
    onChange([...rows, row])
    setOpen((prev) => [...prev, row.key])
  }

  function duplicate(key: string) {
    const source = rows.find((r) => r.key === key)
    if (!source) return
    const copy = duplicateRow(source)
    const next: AntibodyRow[] = []
    for (const r of rows) {
      next.push(r)
      if (r.key === key) next.push(copy)
    }
    onChange(next)
    setOpen((prev) => [...prev, copy.key])
  }

  function remove(key: string) {
    onChange(rows.filter((r) => r.key !== key))
    setOpen((prev) => prev.filter((k) => k !== key))
  }

  return (
    <div className="space-y-3">
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        {rows.map((row, index) => {
          const rowInvalid = invalid(row.key, "markerName") || invalid(row.key, "images")
          const detection = summaryDetection(row)
          return (
            <AccordionItem key={row.key} value={row.key}>
              <div className="flex items-center gap-1 pr-2">
                <div className="min-w-0 flex-1">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      {rowInvalid && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-destructive"
                          title="Incomplete required fields"
                        />
                      )}
                      <span className="font-medium">{row.markerName.trim() || `Antibody ${index + 1}`}</span>
                      {row.cellTypes.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {row.cellTypes.length} cell type{row.cellTypes.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {row.images.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {row.images.length} image{row.images.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {row.dilution && <span className="text-xs text-muted-foreground">{row.dilution}</span>}
                      {detection && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {detection}
                        </Badge>
                      )}
                      {row.works && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {row.works === "Yes" ? "Works" : "Doesn't work"}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {row.rrid.trim() && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 font-mono text-xs font-normal"
                      title="View antibody in database"
                    >
                      <Link
                        href={`/antibody/${row.rrid.trim().replace(/^RRID:/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.rrid.trim()}
                        <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    title="Duplicate antibody"
                    onClick={() => duplicate(row.key)}
                  >
                    <Copy className="size-4" />
                    <span className="sr-only">Duplicate antibody</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Remove antibody"
                    disabled={rows.length === 1}
                    onClick={() => remove(row.key)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove antibody</span>
                  </Button>
                </div>
              </div>

              <AccordionContent className="!h-auto">
                <AntibodyEditor
                  row={row}
                  onChange={(patch) => updateRow(row.key, patch)}
                  method={method}
                  organismId={organismId}
                  invalid={(field) => invalid(row.key, field)}
                  hasLabs={hasLabs}
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add antibody
        </Button>
        {rows.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => duplicate(rows[rows.length - 1].key)}>
            <Copy className="size-4" />
            Duplicate last
          </Button>
        )}
      </div>
    </div>
  )
}
