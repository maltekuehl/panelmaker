"use client"

import { AntibodyRegistryCombobox } from "@/components/antibody-registry-combobox"
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
import { Copy, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
}

function AntibodyEditor({
  row,
  onChange,
  method,
  organismId,
  invalid,
}: {
  row: AntibodyRow
  onChange: (patch: Partial<AntibodyRow> | ((r: AntibodyRow) => AntibodyRow)) => void
  method: MultiplexMethod | ""
  organismId?: number
  invalid: (field: keyof AntibodyRow) => boolean
}) {
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
      markerProtein: value.uniprotId
        ? { id: value.uniprotId, label: value.target || value.name, geneSymbol: value.target || null }
        : r.markerProtein,
    }))

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
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionLabel>Antibody</SectionLabel>
        <div className="space-y-1.5">
          <Label className="text-sm">Search Antibody Registry</Label>
          <AntibodyRegistryCombobox value={row.antibodyRegistry} onChange={handleRegistry} />
          <p className="text-xs text-muted-foreground">
            Search by name, RRID, clone, or target to auto-fill the fields below. You can also type them in manually.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Vendor</Label>
            <Input
              value={row.antibodyVendor}
              onChange={(e) => onChange({ antibodyVendor: e.target.value })}
              placeholder="Abcam"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Catalog #</Label>
            <Input
              value={row.catalogNumber}
              onChange={(e) => onChange({ catalogNumber: e.target.value })}
              placeholder="ab16667"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Clone ID</Label>
            <Input value={row.cloneId} onChange={(e) => onChange({ cloneId: e.target.value })} placeholder="SP7" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">RRID</Label>
            <Input
              value={row.rrid}
              onChange={(e) => onChange({ rrid: e.target.value })}
              placeholder="AB_302411"
              className="font-mono"
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:max-w-md">
          <Label className="text-sm">Host species</Label>
          <OntologyCombobox
            ontologyType="ncbi_taxonomy"
            value={row.hostSpecies}
            onChange={(hostSpecies) => onChange({ hostSpecies })}
            placeholder="Species the antibody was raised in..."
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-5">
        <SectionLabel>Target</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Target protein</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">
              Marker name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={row.markerName}
              onChange={(e) => onChange({ markerName: e.target.value })}
              placeholder="e.g. CD3e, Ki-67, PanCK"
              aria-invalid={invalid("markerName")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">
            Cell type(s) <span className="text-destructive">*</span>
          </Label>
          <div className={cn(invalid("cellTypes") && "rounded-md ring-1 ring-destructive")}>
            <OntologyMultiCombobox
              ontologyType="cl"
              values={row.cellTypes}
              onChange={(cellTypes) => onChange({ cellTypes })}
              placeholder="Search cell types where staining is observed..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-5">
        <SectionLabel>Protocol</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-sm">
              Dilution <span className="text-destructive">*</span>
            </Label>
            <Input
              value={row.dilution}
              onChange={(e) => onChange({ dilution: e.target.value })}
              placeholder="1:100, 5 µg/mL"
              aria-invalid={invalid("dilution")}
            />
          </div>
          {methodNeedsFluorophore(method) && (
            <div className="space-y-1.5">
              <Label className="text-sm">Fluorophore</Label>
              <Input
                value={row.fluorophore}
                onChange={(e) => onChange({ fluorophore: e.target.value })}
                placeholder="AF647, Opal 570"
              />
            </div>
          )}
          {methodNeedsMetal(method) && (
            <div className="space-y-1.5">
              <Label className="text-sm">Metal tag</Label>
              <Input
                value={row.metalTag}
                onChange={(e) => onChange({ metalTag: e.target.value })}
                placeholder="141Pr, 176Yb"
              />
            </div>
          )}
          {methodNeedsCycle(method) && (
            <div className="space-y-1.5">
              <Label className="text-sm">Cycle #</Label>
              <Input
                type="number"
                min={1}
                value={row.cycleNumber}
                onChange={(e) => onChange({ cycleNumber: e.target.value })}
                placeholder="3"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm">Incubation</Label>
            <Input
              value={row.incubation}
              onChange={(e) => onChange({ incubation: e.target.value })}
              placeholder="Overnight at 4°C"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-5">
        <SectionLabel>Results</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Antibody works</Label>
            <Select value={row.works || undefined} onValueChange={(works) => onChange({ works })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {WORKS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Signal quality</Label>
            <Select
              value={row.signalQuality || undefined}
              onValueChange={(signalQuality) => onChange({ signalQuality })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Specificity</Label>
            <Select value={row.specificity || undefined} onValueChange={(specificity) => onChange({ specificity })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {SPECIFICITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Observed subcellular location</Label>
          <div className="sm:max-w-md">
            <OntologyCombobox
              ontologyType="go_cc"
              value={row.subcellularLocation}
              onChange={(subcellularLocation) => onChange({ subcellularLocation })}
              placeholder="Search GO cellular component..."
              disabled={row.locationNotDiscernible}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={row.locationNotDiscernible}
              onCheckedChange={(checked) =>
                onChange({
                  locationNotDiscernible: checked === true,
                  subcellularLocation: checked === true ? null : row.subcellularLocation,
                })
              }
            />
            Not discernible (insufficient resolution)
          </label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Additional notes</Label>
          <Textarea
            value={row.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Blocking buffer, troubleshooting tips, anything else worth noting..."
            className="min-h-[80px]"
          />
        </div>
      </div>
    </div>
  )
}

function summaryDetection(row: AntibodyRow): string | null {
  return row.fluorophore || row.metalTag || (row.cycleNumber ? `Cycle ${row.cycleNumber}` : null)
}

export function AntibodyAccordion({
  rows,
  onChange,
  method,
  organismId,
  invalid,
}: {
  rows: AntibodyRow[]
  onChange: (rows: AntibodyRow[]) => void
  method: MultiplexMethod | ""
  organismId?: number
  invalid: (key: string, field: keyof AntibodyRow) => boolean
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
      <Accordion type="multiple" value={open} onValueChange={setOpen} className="rounded-md">
        {rows.map((row, index) => {
          const rowInvalid =
            invalid(row.key, "markerName") || invalid(row.key, "cellTypes") || invalid(row.key, "dilution")
          const detection = summaryDetection(row)
          return (
            <AccordionItem key={row.key} value={row.key} className="relative">
              <AccordionTrigger className="pr-24 hover:no-underline">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  {rowInvalid && (
                    <span className="size-2 shrink-0 rounded-full bg-destructive" title="Incomplete required fields" />
                  )}
                  <span className="font-medium">{row.markerName.trim() || `Antibody ${index + 1}`}</span>
                  {row.antibodyRegistry?.citation && (
                    <Badge variant="outline" className="font-mono text-xs font-normal">
                      {row.antibodyRegistry.citation}
                    </Badge>
                  )}
                  {row.cellTypes.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {row.cellTypes.length} cell type{row.cellTypes.length === 1 ? "" : "s"}
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

              <div className="absolute right-12 top-2.5 z-10 flex items-center gap-0.5">
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

              <AccordionContent>
                <AntibodyEditor
                  row={row}
                  onChange={(patch) => updateRow(row.key, patch)}
                  method={method}
                  organismId={organismId}
                  invalid={(field) => invalid(row.key, field)}
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
