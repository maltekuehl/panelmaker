import type { InstitutionEntry, LeaderboardEntry, RecentReportRow, UserProfileRow, UserStats } from "./queries"

export type { InstitutionEntry, LeaderboardEntry, UserProfileRow, UserStats }

export type RecentReportSummary = {
  id: number
  markerName: string
  proteinId: string | null
  antibodyRrid: string | null
  cellType: string | null
  method: string | null
  species: string | null
  status: string
  createdAt: Date
}

const SPECIES_LABELS: Record<string, string> = {
  HUMAN: "Homo sapiens",
  MOUSE: "Mus musculus",
  RAT: "Rattus norvegicus",
  NON_HUMAN_PRIMATE: "Non-human primate",
  PIG: "Sus scrofa",
  RABBIT: "Oryctolagus cuniculus",
  ZEBRAFISH: "Danio rerio",
  OTHER: "Other",
}

export function toRecentReportSummary(report: RecentReportRow): RecentReportSummary {
  return {
    id: report.id,
    markerName: report.antibody?.name ?? `Report #${report.id}`,
    proteinId: report.antibody?.targetProteinId ?? null,
    antibodyRrid: report.antibody?.rrid ?? null,
    cellType: report.cellType?.label ?? null,
    method: report.method,
    species: report.species ? (SPECIES_LABELS[report.species] ?? report.species) : null,
    status: report.status,
    createdAt: report.createdAt,
  }
}

export type ContributionTier = {
  label: string
  color: string
}

export function getContributionTier(reportCount: number): ContributionTier {
  if (reportCount === 0) return { label: "New Member", color: "bg-zinc-100 text-zinc-700" }
  if (reportCount < 5) return { label: "Contributor", color: "bg-blue-100 text-blue-700" }
  if (reportCount < 15) return { label: "Active Contributor", color: "bg-emerald-100 text-emerald-700" }
  if (reportCount < 30) return { label: "Expert", color: "bg-purple-100 text-purple-700" }
  return { label: "Champion", color: "bg-amber-100 text-amber-700" }
}
