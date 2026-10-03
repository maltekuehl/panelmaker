import type { EntryFilterParams } from "@/lib/data-table"
import type { Prisma } from "@/lib/generated/prisma/client"

export const REPORT_FILTER_WHERE: Record<string, (values: string[]) => Prisma.ExperimentalReportWhereInput | null> = {
  marker: (v) => ({ antibody: { targetProteinId: { in: v } } }),
  cellType: (v) => ({ cellTypes: { some: { cellTypeId: { in: v } } } }),
  species: (v) => ({ experiment: { speciesId: { in: v } } }),
  tissue: (v) => ({ experiment: { tissueId: { in: v } } }),
  method: (v) => ({ experiment: { imagingMethodId: { in: v } } }),
  preservation: (v) => ({ experiment: { preservation: { in: v as Prisma.EnumPreservationNullableFilter["in"] } } }),
  fixative: (v) => ({ experiment: { fixativeId: { in: v } } }),
  vendor: (v) => ({ antibody: { vendorName: { in: v } } }),
  host: (v) => ({ antibody: { hostTaxonId: { in: v } } }),
  conjugate: (v) => ({ antibody: { conjugate: { in: v } } }),
  clonality: (v) => ({ antibody: { clonality: { in: v as Prisma.EnumClonalityNullableFilter["in"] } } }),
  subcellular: (v) => ({ subcellularId: { in: v } }),
  condition: (v) => ({ experiment: { conditionId: { in: v } } }),
  recommendation: (v) => ({ recommendation: { in: v as Prisma.EnumRecommendationNullableFilter["in"] } }),
  validation: (v) => ({ validations: { some: { methodId: { in: v }, result: "SUPPORTS" } } }),
  issue: (v) => ({ issues: { some: { issueId: { in: v } } } }),
  lab: (v) => ({ experiment: { owningLabId: { in: v } } }),
  source: (v) => ({ experiment: { sourceId: { in: v } } }),
}

const REPORT_LEVEL_FILTER_KEYS = [
  "marker",
  "cellType",
  "vendor",
  "host",
  "conjugate",
  "clonality",
  "subcellular",
  "recommendation",
  "validation",
  "issue",
] as const satisfies (keyof EntryFilterParams)[]

// The report-level dimensions as one predicate, so a parent (an experiment) can require a single report
// that satisfies all of them together rather than one report per dimension.
export function reportLevelWhere(params: EntryFilterParams): Prisma.ExperimentalReportWhereInput | null {
  const conditions = REPORT_LEVEL_FILTER_KEYS.flatMap((key) => {
    const values = params[key]
    const condition = values.length > 0 ? REPORT_FILTER_WHERE[key](values) : null
    return condition ? [condition] : []
  })
  return conditions.length > 0 ? { AND: conditions } : null
}
