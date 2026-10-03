import { DONOR_SEX_LABELS, DONOR_SEX_PATO_IDS, PRESERVATION_LABELS, SAMPLE_TYPE_LABELS } from "@/lib/constants"
import type { DonorSex, Preservation, SampleType } from "@/lib/generated/prisma/enums"

export type SpecimenSource = {
  preservation: Preservation | null
  preservationText: string | null
  fixative: { id: string; label: string } | null
  fixativeConcentration: string | null
  antigenRetrievalText: string | null
  sampleType: SampleType | null
  sectionThicknessUm: number | null
  donorSex: DonorSex | null
  donorAge: string | null
  developmentalStage: { id: string; label: string } | null
  protocolDoi: string | null
}

export type SpecimenDetail = SpecimenSource

export function toSpecimenDetail(source: SpecimenSource): SpecimenDetail {
  return {
    preservation: source.preservation,
    preservationText: source.preservationText,
    fixative: source.fixative ? { id: source.fixative.id, label: source.fixative.label } : null,
    fixativeConcentration: source.fixativeConcentration,
    antigenRetrievalText: source.antigenRetrievalText,
    sampleType: source.sampleType,
    sectionThicknessUm: source.sectionThicknessUm,
    donorSex: source.donorSex,
    donorAge: source.donorAge,
    developmentalStage: source.developmentalStage
      ? { id: source.developmentalStage.id, label: source.developmentalStage.label }
      : null,
    protocolDoi: source.protocolDoi,
  }
}

export function preservationLabel(detail: Pick<SpecimenDetail, "preservation" | "preservationText">): string | null {
  const enumLabel = detail.preservation ? PRESERVATION_LABELS[detail.preservation] : null
  if (enumLabel && detail.preservationText) return `${enumLabel} (${detail.preservationText})`
  return enumLabel ?? detail.preservationText
}

export function fixativeLabel(detail: Pick<SpecimenDetail, "fixative" | "fixativeConcentration">): string | null {
  if (!detail.fixative) return detail.fixativeConcentration
  return detail.fixativeConcentration
    ? `${detail.fixativeConcentration} ${detail.fixative.label}`
    : detail.fixative.label
}

export type SpecimenField = { label: string; value: string; hint?: string }

// Only the fields that actually carry a value, so a record with no donor metadata renders nothing.
export function specimenFieldList(detail: SpecimenDetail): SpecimenField[] {
  const fields: SpecimenField[] = []
  const preservation = preservationLabel(detail)
  if (preservation) fields.push({ label: "Preservation", value: preservation })

  const fixative = fixativeLabel(detail)
  if (fixative) fields.push({ label: "Fixative", value: fixative, hint: detail.fixative?.id })

  if (detail.antigenRetrievalText) {
    fields.push({ label: "Antigen retrieval protocol", value: detail.antigenRetrievalText })
  }
  if (detail.sampleType) fields.push({ label: "Sample type", value: SAMPLE_TYPE_LABELS[detail.sampleType] })
  if (detail.sectionThicknessUm !== null) {
    fields.push({ label: "Section thickness", value: `${detail.sectionThicknessUm} um` })
  }
  if (detail.donorSex) {
    fields.push({
      label: "Donor sex",
      value: DONOR_SEX_LABELS[detail.donorSex],
      hint: DONOR_SEX_PATO_IDS[detail.donorSex] ?? undefined,
    })
  }
  if (detail.donorAge) fields.push({ label: "Donor age", value: detail.donorAge })
  if (detail.developmentalStage) {
    fields.push({
      label: "Developmental stage",
      value: detail.developmentalStage.label,
      hint: detail.developmentalStage.id,
    })
  }
  return fields
}

export function hasSpecimenDetail(detail: SpecimenDetail): boolean {
  return specimenFieldList(detail).length > 0 || detail.protocolDoi !== null
}
