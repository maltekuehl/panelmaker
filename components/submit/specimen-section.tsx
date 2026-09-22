"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { Field } from "@/components/shared/field"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isValidDonorAge } from "@/models/experiment/schema"
import {
  DONOR_SEX_OPTIONS,
  SAMPLE_TYPE_OPTIONS,
  developmentalStageOntology,
  type OntologyValue,
  type SpecimenContext,
} from "./types"

export function SpecimenSection({
  specimen,
  species,
  onChange,
}: {
  specimen: SpecimenContext
  species: OntologyValue | null
  onChange: (next: SpecimenContext) => void
}) {
  const stageOntology = developmentalStageOntology(species)
  const ageInvalid = specimen.donorAge.trim().length > 0 && !isValidDonorAge(specimen.donorAge)

  function set<K extends keyof SpecimenContext>(key: K, value: SpecimenContext[K]) {
    onChange({ ...specimen, [key]: value })
  }

  return (
    <Accordion type="single" collapsible className="rounded-md border">
      <AccordionItem value="specimen" className="border-b-0">
        <AccordionTrigger className="px-3 hover:no-underline">
          <div className="text-left">
            <span className="text-sm font-medium">Donor and specimen details (optional)</span>
            <p className="text-xs font-normal text-muted-foreground">
              Fixative, section thickness, donor sex, age and developmental stage. Every field can be left empty.
            </p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 px-3 pb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fixative" hint="ChEBI chemistry, for example paraformaldehyde">
              {(id) => (
                <OntologyCombobox
                  id={id}
                  ontologyType="chebi"
                  value={specimen.fixative}
                  onChange={(fixative) => set("fixative", fixative)}
                  placeholder="Search ChEBI"
                />
              )}
            </Field>

            <Field label="Fixative concentration" hint="As recorded, for example 4% or 1:4 Cytofix">
              <Input
                value={specimen.fixativeConcentration}
                onChange={(event) => set("fixativeConcentration", event.target.value)}
                placeholder="e.g. 4%"
              />
            </Field>
          </div>

          <Field label="Preservation notes" hint="The preservation exactly as your protocol words it">
            <Input
              value={specimen.preservationText}
              onChange={(event) => set("preservationText", event.target.value)}
              placeholder="e.g. 1% PFA fixed frozen"
            />
          </Field>

          <Field
            label="Antigen retrieval protocol"
            hint="Buffer, pH, temperature and time, including protocols that run two retrievals"
          >
            <Input
              value={specimen.antigenRetrievalText}
              onChange={(event) => set("antigenRetrievalText", event.target.value)}
              placeholder="e.g. pH 6 for 30 min ER1, then pH 9 for 30 min ER2"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sample type">
              {(id) => (
                <Select value={specimen.sampleType} onValueChange={(value) => set("sampleType", value)}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select sample type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Section thickness (um)">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={specimen.sectionThicknessUm}
                onChange={(event) => set("sectionThicknessUm", event.target.value)}
                placeholder="e.g. 5"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Donor sex">
              {(id) => (
                <Select value={specimen.donorSex} onValueChange={(value) => set("donorSex", value)}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    {DONOR_SEX_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Donor age" hint="SDRF form: 45Y, 30Y6M or 40Y-50Y">
              <Input
                value={specimen.donorAge}
                onChange={(event) => set("donorAge", event.target.value)}
                placeholder="e.g. 45Y"
                aria-invalid={ageInvalid}
              />
            </Field>

            <Field
              label="Developmental stage"
              hint={
                stageOntology === "hsapdv"
                  ? "HsapDv, chosen from the human species"
                  : stageOntology === "mmusdv"
                    ? "MmusDv, chosen from the mouse species"
                    : "Pick a human or mouse species first"
              }
            >
              {(id) => (
                <OntologyCombobox
                  id={id}
                  ontologyType={stageOntology ?? "hsapdv"}
                  value={specimen.developmentalStage}
                  onChange={(stage) => set("developmentalStage", stage)}
                  placeholder="Search stages"
                  disabled={stageOntology === null}
                />
              )}
            </Field>
          </div>

          {ageInvalid && (
            <p className="text-xs text-destructive">
              Donor age must use the SDRF form, for example 45Y, 30Y6M or 40Y-50Y.
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
