import "server-only"

import type { Prisma, ValidationStatus } from "@/lib/generated/prisma/client"
import type { LabRole } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { isLabMember, type ViewerContext } from "@/models/lab/access"
import { getLabMembers } from "@/models/lab/queries"
import { buildExperimentVisibilityWhere } from "@/models/lab/visibility"

const userProfileSelect = {
  id: true,
  name: true,
  image: true,
  institution: true,
  institutionId: true,
  orcid: true,
  createdAt: true,
} as const

export type UserProfileRow = {
  id: string
  name: string | null
  image: string | null
  institution: string | null
  institutionId: string | null
  orcid: string | null
  createdAt: Date
}

export type UserStats = {
  totalReports: number
  publishedReports: number
  pendingReports: number
  publicPanels: number
  methods: string[]
  species: string[]
}

export type LeaderboardEntry = {
  userId: string
  name: string | null
  image: string | null
  institution: string | null
  reportCount: number
  publishedCount: number
}

// A lab board adds the contributor's role in that lab (null once they leave it) and how much of their
// counted work is lab-visible rather than public.
export type LabLeaderboardEntry = LeaderboardEntry & {
  role: LabRole | null
  labOnlyCount: number
}

// The category a board is ranked within: the same multi-value dimensions browse filters on. An empty
// or missing dimension never narrows; several values in one dimension widen it (OR), and dimensions
// combine (AND), exactly as the browse tables behave.
export type LeaderboardFilters = {
  speciesIds?: string[]
  tissueIds?: string[]
  methodIds?: string[]
  preservations?: string[]
  fixativeIds?: string[]
  conditionIds?: string[]
}

export type LeaderboardScope = LeaderboardFilters & { labIds?: string[] }

type ContributionTally = { reportCount: number; publishedCount: number; labOnlyCount: number }

export async function getUserProfile(userId: string): Promise<UserProfileRow | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect,
  })
}

export async function getUserStats(userId: string, includeNonPublished = false): Promise<UserStats> {
  const reportVisibility = includeNonPublished
    ? { experiment: { submitterId: userId, visibility: "PUBLIC" as const } }
    : { experiment: { submitterId: userId, visibility: "PUBLIC" as const }, status: "PUBLISHED" as const }

  const [totalReports, publishedReports, pendingReports, publicPanels, methodRows, speciesRows] = await Promise.all([
    prisma.experimentalReport.count({ where: reportVisibility }),
    prisma.experimentalReport.count({
      where: { experiment: { submitterId: userId, visibility: "PUBLIC" }, status: "PUBLISHED" },
    }),
    includeNonPublished
      ? prisma.experimentalReport.count({
          where: { experiment: { submitterId: userId, visibility: "PUBLIC" }, status: "PENDING" },
        })
      : Promise.resolve(0),
    prisma.panel.count({ where: { ownerId: userId, visibility: "PUBLIC" } }),
    prisma.experiment.findMany({
      where: { submitterId: userId, visibility: "PUBLIC", imagingMethodId: { not: null } },
      select: { imagingMethod: { select: { label: true } } },
      distinct: ["imagingMethodId"],
    }),
    prisma.experiment.findMany({
      where: { submitterId: userId, visibility: "PUBLIC", speciesId: { not: null } },
      select: { species: { select: { id: true, label: true } } },
      distinct: ["speciesId"],
    }),
  ])

  return {
    totalReports,
    publishedReports,
    pendingReports,
    publicPanels,
    methods: methodRows.map((r) => r.imagingMethod?.label).filter((l): l is string => l != null),
    species: speciesRows.map((r) => r.species?.label).filter((l): l is string => l != null),
  }
}

const recentReportSelect = {
  id: true,
  status: true,
  createdAt: true,
  experiment: {
    select: {
      imagingMethod: { select: { id: true, label: true } },
      species: { select: { id: true, label: true } },
    },
  },
  antibody: {
    select: {
      id: true,
      name: true,
      rrid: true,
      targetName: true,
      targetProteinId: true,
    },
  },
  cellTypes: { select: { cellType: { select: { id: true, label: true } } } },
} as const

export type RecentReportRow = {
  id: string
  method: string | null
  species: { id: string; label: string } | null
  status: ValidationStatus
  createdAt: Date
  antibody: {
    id: string
    name: string
    rrid: string | null
    targetName: string | null
    targetProteinId: string | null
  } | null
  cellTypes: { cellType: { id: string; label: string } }[]
}

export async function getUserRecentReports(
  userId: string,
  limit = 20,
  includeNonPublished = false,
): Promise<RecentReportRow[]> {
  const rows = await prisma.experimentalReport.findMany({
    where: includeNonPublished
      ? { experiment: { submitterId: userId, visibility: "PUBLIC" } }
      : { experiment: { submitterId: userId, visibility: "PUBLIC" }, status: "PUBLISHED" },
    select: recentReportSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return rows.map((r) => ({
    id: r.id,
    method: r.experiment.imagingMethod?.label ?? null,
    species: r.experiment.species,
    status: r.status,
    createdAt: r.createdAt,
    antibody: r.antibody,
    cellTypes: r.cellTypes,
  }))
}

// A lab claims work that was either created under the lab or explicitly shared with it.
function labAttributionWhere(labIds: string[]): Prisma.ExperimentWhereInput {
  return { OR: [{ owningLabId: { in: labIds } }, { labShares: { some: { labId: { in: labIds } } } }] }
}

function categoryWhere(filters: LeaderboardFilters): Prisma.ExperimentWhereInput[] {
  const clauses: Prisma.ExperimentWhereInput[] = []
  if (filters.speciesIds?.length) clauses.push({ speciesId: { in: filters.speciesIds } })
  if (filters.tissueIds?.length) clauses.push({ tissueId: { in: filters.tissueIds } })
  if (filters.methodIds?.length) clauses.push({ imagingMethodId: { in: filters.methodIds } })
  if (filters.preservations?.length) {
    clauses.push({ preservation: { in: filters.preservations as Prisma.EnumPreservationNullableFilter["in"] } })
  }
  if (filters.fixativeIds?.length) clauses.push({ fixativeId: { in: filters.fixativeIds } })
  if (filters.conditionIds?.length) clauses.push({ conditionId: { in: filters.conditionIds } })
  return clauses
}

function emptyTally(): ContributionTally {
  return { reportCount: 0, publishedCount: 0, labOnlyCount: 0 }
}

// One roll-up shared by both boards: every experiment matching `where` is credited to its submitter,
// and its reports are counted by status. The two boards differ only in the `where` they pass in.
async function tallyByContributor(where: Prisma.ExperimentWhereInput): Promise<Map<string, ContributionTally>> {
  const [experiments, reportGroups] = await Promise.all([
    prisma.experiment.findMany({ where, select: { id: true, submitterId: true, visibility: true } }),
    prisma.experimentalReport.groupBy({
      by: ["experimentId", "status"],
      where: { experiment: where },
      _count: { _all: true },
    }),
  ])

  const experimentById = new Map(experiments.map((experiment) => [experiment.id, experiment]))
  const tally = new Map<string, ContributionTally>()

  for (const experiment of experiments) {
    if (!experiment.submitterId) continue
    if (!tally.has(experiment.submitterId)) tally.set(experiment.submitterId, emptyTally())
  }

  for (const group of reportGroups) {
    const experiment = experimentById.get(group.experimentId)
    if (!experiment?.submitterId) continue
    const current = tally.get(experiment.submitterId) ?? emptyTally()
    current.reportCount += group._count._all
    if (group.status === "PUBLISHED") current.publishedCount += group._count._all
    if (experiment.visibility !== "PUBLIC") current.labOnlyCount += group._count._all
    tally.set(experiment.submitterId, current)
  }

  return tally
}

async function loadContributors(userIds: string[]) {
  if (userIds.length === 0)
    return new Map<string, { id: string; name: string | null; image: string | null; institution: string | null }>()
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true, institution: true },
  })
  return new Map(users.map((user) => [user.id, user]))
}

function byContribution(a: ContributionTally, b: ContributionTally): number {
  return b.reportCount - a.reportCount || b.publishedCount - a.publishedCount
}

// Public lane. viewer is always null here, so buildExperimentVisibilityWhere collapses to PUBLIC-only
// and the result depends on nothing but its arguments. Safe to call inside a "use cache" scope.
export async function getLeaderboard(limit = 50, scope: LeaderboardScope = {}): Promise<LeaderboardEntry[]> {
  const where: Prisma.ExperimentWhereInput = {
    AND: [
      buildExperimentVisibilityWhere(null),
      { submitterId: { not: null } },
      ...(scope.labIds?.length ? [labAttributionWhere(scope.labIds)] : []),
      ...categoryWhere(scope),
    ],
  }

  const tally = await tallyByContributor(where)
  const ranked = [...tally.entries()]
    .sort(([aId, a], [bId, b]) => byContribution(a, b) || aId.localeCompare(bId))
    .slice(0, limit)
  const profiles = await loadContributors(ranked.map(([userId]) => userId))

  return ranked
    .filter(([userId]) => profiles.has(userId))
    .map(([userId, counts]) => {
      const profile = profiles.get(userId)
      return {
        userId,
        name: profile?.name ?? null,
        image: profile?.image ?? null,
        institution: profile?.institution ?? null,
        reportCount: counts.reportCount,
        publishedCount: counts.publishedCount,
      }
    })
}

// Private lane. Ranks the people of one lab by the work that lab can actually see: its public work plus
// its own LAB-visible work. Never cached, because it reads a ViewerContext.
//
// Three clauses, composed rather than hand-rolled:
//   1. buildExperimentVisibilityWhere(lens) - the shared visibility predicate, with the viewer narrowed
//      to this one lab so work shared with another of the viewer's labs cannot widen this board;
//   2. labAttributionWhere(labId) - only work this lab owns or was shared;
//   3. visibility in (PUBLIC, LAB) - a lab board never counts anyone's PRIVATE drafts, not even the
//      viewer's own, so every member of a lab sees the same board.
export async function getLabLeaderboard(
  labId: string,
  viewer: ViewerContext | null,
  limit = 50,
  filters: LeaderboardFilters = {},
): Promise<LabLeaderboardEntry[]> {
  if (!viewer || !isLabMember(viewer, labId)) throw new Error("Lab membership required")

  const role = viewer.roleByLab[labId]
  const lens: ViewerContext = { ...viewer, labIds: [labId], roleByLab: role ? { [labId]: role } : {} }

  const where: Prisma.ExperimentWhereInput = {
    AND: [
      buildExperimentVisibilityWhere(lens),
      labAttributionWhere([labId]),
      { visibility: { in: ["PUBLIC", "LAB"] } },
      { submitterId: { not: null } },
      ...categoryWhere(filters),
    ],
  }

  const [tally, members] = await Promise.all([tallyByContributor(where), getLabMembers(labId)])

  const entries = new Map<string, LabLeaderboardEntry>()
  for (const member of members) {
    entries.set(member.user.id, {
      userId: member.user.id,
      name: member.user.name,
      image: member.user.image,
      institution: member.user.institution,
      role: member.role,
      ...(tally.get(member.user.id) ?? emptyTally()),
    })
  }

  // Work attributed to the lab can also come from someone who has since left it. They still count, with
  // no role, rather than silently dropping reports the lab can see.
  const pastContributorIds = [...tally.keys()].filter((userId) => !entries.has(userId))
  const profiles = await loadContributors(pastContributorIds)
  for (const userId of pastContributorIds) {
    const profile = profiles.get(userId)
    if (!profile) continue
    entries.set(userId, {
      userId,
      name: profile.name,
      image: profile.image,
      institution: profile.institution,
      role: null,
      ...(tally.get(userId) ?? emptyTally()),
    })
  }

  return [...entries.values()]
    .sort((a, b) => byContribution(a, b) || (a.name ?? "").localeCompare(b.name ?? ""))
    .slice(0, limit)
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string | null; orcid?: string | null; institution?: string | null; institutionId?: string | null },
): Promise<UserProfileRow> {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: userProfileSelect,
  })
}
