"use client"

import { OntologyCombobox } from "@/components/ontology-combobox"
import { OptionSelect } from "@/components/option-select"
import { Label } from "@/components/ui/label"
import { SpecimenSection } from "./specimen-section"
import { ANTIGEN_RETRIEVAL_OPTIONS, PRESERVATION_OPTIONS, type ExperimentContext } from "./types"

export function ExperimentMethodSection({
  context,
  onChange,
}: {
  context: ExperimentContext
  onChange: (next: ExperimentContext) => void
}) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Sample</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="method-species">Target species</Label>
              <OntologyCombobox
                id="method-species"
                ontologyType="ncbi_taxonomy"
                value={context.species}
                onChange={(species) => onChange({ ...context, species })}
                placeholder="Search species…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method-tissue">Tissue type</Label>
              <OntologyCombobox
                id="method-tissue"
                ontologyType="uberon"
                value={context.tissue}
                onChange={(tissue) => onChange({ ...context, tissue })}
                placeholder="Search tissue…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method-condition">Condition</Label>
            <OntologyCombobox
              id="method-condition"
              ontologyType="doid"
              value={context.condition}
              onChange={(condition) => onChange({ ...context, condition })}
              placeholder="Search disease ontology (e.g. carcinoma, nephropathy)…"
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
          <h3 className="text-sm font-semibold">Method</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="method-method">Imaging method</Label>
              <OntologyCombobox
                id="method-method"
                ontologyType="imaging_method"
                value={context.imagingMethod}
                onChange={(imagingMethod) => onChange({ ...context, imagingMethod })}
                placeholder="Search EFO imaging methods…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method-preservation">Preservation</Label>
              <OptionSelect
                id="method-preservation"
                value={context.preservation}
                onValueChange={(preservation) => onChange({ ...context, preservation })}
                options={PRESERVATION_OPTIONS}
                placeholder="Select preservation"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method-retrieval">Antigen retrieval</Label>
              <OptionSelect
                id="method-retrieval"
                value={context.antigenRetrieval}
                onValueChange={(antigenRetrieval) => onChange({ ...context, antigenRetrieval })}
                options={ANTIGEN_RETRIEVAL_OPTIONS}
                placeholder="Select retrieval"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <SpecimenSection
          specimen={context.specimen}
          species={context.species}
          onChange={(specimen) => onChange({ ...context, specimen })}
        />
      </div>
    </div>
  )
}
