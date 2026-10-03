"use client"

import { AntibodyRegistryCombobox, lookupHostSpecies } from "@/components/antibody-registry-combobox"
import { FluorophoreCombobox } from "@/components/fluorophore-combobox"
import { OntologyCombobox } from "@/components/ontology-combobox"
import { OntologyMultiCombobox } from "@/components/ontology-multi-combobox"
import { Field } from "@/components/shared/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ReactNode } from "react"
import { AssessmentFields, type AssessmentTerms } from "./assessment-fields"
import { LabInventoryCombobox, type LabInventoryImportItem } from "./lab-inventory-combobox"
import { ProteinCombobox } from "./protein-combobox"
import type { AntibodyRow } from "./types"

export function AntibodyEditor({
  row,
  onChange,
  organismId,
  invalid,
  hasLabs,
  images,
  terms,
}: {
  row: AntibodyRow
  onChange: (patch: Partial<AntibodyRow> | ((r: AntibodyRow) => AntibodyRow)) => void
  organismId?: number
  invalid: (field: keyof AntibodyRow) => boolean
  hasLabs?: boolean
  images: ReactNode
  terms: AssessmentTerms
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
      const host = await lookupHostSpecies(value.sourceOrganism)
      if (host) onChange((r) => ({ ...r, hostSpecies: host }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <AntibodyRegistryCombobox value={row.antibodyRegistry} onChange={handleRegistry} />
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
            placeholder="Raised in…"
          />
        </Field>
        <Field label="Cell type(s)" className="sm:col-span-3">
          <OntologyMultiCombobox
            ontologyType="cl"
            values={row.cellTypes}
            onChange={(cellTypes) => onChange({ cellTypes })}
            placeholder="Search cell types where staining is observed…"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3 lg:grid-cols-4">
        <Field label="Dilution">
          <Input value={row.dilution} onChange={(e) => onChange({ dilution: e.target.value })} placeholder="1:100" />
        </Field>
        <Field label="Concentration (µg/mL)">
          <Input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={row.concentration}
            onChange={(e) => onChange({ concentration: e.target.value })}
            placeholder="2.5"
          />
        </Field>
        <Field label="Fluorophore">
          <FluorophoreCombobox value={row.fluorophore} onChange={(fluorophore) => onChange({ fluorophore })} />
        </Field>
        <Field label="Metal tag">
          <Input value={row.metalTag} onChange={(e) => onChange({ metalTag: e.target.value })} placeholder="141Pr" />
        </Field>
        <Field label="Cycle #">
          <Input
            type="number"
            min={1}
            value={row.cycleNumber}
            onChange={(e) => onChange({ cycleNumber: e.target.value })}
          />
        </Field>
        <Field label="Incubation">
          <Input
            value={row.incubation}
            onChange={(e) => onChange({ incubation: e.target.value })}
            placeholder="Overnight 4°C"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3 lg:grid-cols-4">
        <Field label="Subcellular location" className="col-span-2">
          <OntologyCombobox
            ontologyType="go_cc"
            value={row.subcellularLocation}
            onChange={(subcellularLocation) => onChange({ subcellularLocation })}
            placeholder="GO component…"
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

      <AssessmentFields row={row} terms={terms} onChange={onChange} />

      <Field label="Images" required className="border-t pt-3">
        {images}
      </Field>

      <Field label="Additional notes">
        <Textarea
          value={row.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Blocking buffer, troubleshooting tips, anything else worth noting…"
          className="min-h-[60px]"
        />
      </Field>
    </div>
  )
}
