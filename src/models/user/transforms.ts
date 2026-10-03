import type { LeaderboardEntry, RecentReportRow, UserProfileRow, UserStats } from "./queries"

export type { LeaderboardEntry, UserProfileRow, UserStats }

// Emails are compared as identity keys, so every read and write has to agree on one spelling.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type RecentReportSummary = {
  id: string
  markerName: string
  proteinId: string | null
  antibodyRrid: string | null
  cellType: string | null
  method: string | null
  species: string | null
  status: string
  createdAt: Date
}

export function toRecentReportSummary(report: RecentReportRow): RecentReportSummary {
  return {
    id: report.id,
    markerName: report.antibody?.name ?? "Unlinked antibody",
    proteinId: report.antibody?.targetProteinId ?? null,
    antibodyRrid: report.antibody?.rrid ?? null,
    cellType: report.cellTypes.map((l) => l.cellType.label).join(", ") || null,
    method: report.method,
    species: report.species?.label ?? null,
    status: report.status,
    createdAt: report.createdAt,
  }
}

export type ContributionTier = {
  label: string
  color: string
}

export function getContributionTier(reportCount: number): ContributionTier {
  if (reportCount === 0) return { label: "New Member", color: "bg-muted text-muted-foreground" }
  if (reportCount < 5) return { label: "Contributor", color: "bg-primary/10 text-primary" }
  if (reportCount < 15) {
    return { label: "Active Contributor", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
  }
  if (reportCount < 30) return { label: "Expert", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300" }
  return { label: "Champion", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" }
}
