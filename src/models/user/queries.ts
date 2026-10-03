import "server-only"

import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/error-handling"
import type { Prisma, ValidationStatus } from "@/lib/generated/prisma/client"
import { type LabRole, UserRole, UserStatus, Visibility } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { isLabMember, type ViewerContext } from "@/models/lab/access"
import { getLabMembers, getSoleOwnerLabIds } from "@/models/lab/queries"
import { buildExperimentVisibilityWhere } from "@/models/lab/visibility"
import bcrypt from "bcryptjs"
import type { RegisterData, UpdateProfileData } from "./schema"
import { normalizeEmail } from "./transforms"

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
  if (!viewer || !isLabMember(viewer, labId)) throw new ForbiddenError("Lab membership required")

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

export async function updateUserProfile(userId: string, data: UpdateProfileData): Promise<UserProfileRow> {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: userProfileSelect,
  })
}

export async function registerUser(
  data: RegisterData,
): Promise<{ id: string; name: string | null; email: string | null }> {
  const email = normalizeEmail(data.email)
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ConflictError("An account with this email already exists")
  }
  if (data.orcid && (await prisma.user.findUnique({ where: { orcid: data.orcid }, select: { id: true } }))) {
    throw new ConflictError("An account with this ORCID already exists")
  }

  return prisma.user.create({
    data: {
      name: data.name,
      email,
      password: await bcrypt.hash(data.password, 12),
      orcid: data.orcid || null,
      institution: data.institution || null,
      institutionId: data.institutionId || null,
    },
    select: { id: true, name: true, email: true },
  })
}

async function requireUserRole(userId: string): Promise<{ role: UserRole }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) throw new NotFoundError("User not found", "USER_NOT_FOUND")
  return user
}

export async function blockUser(userId: string): Promise<void> {
  const target = await requireUserRole(userId)
  if (target.role === UserRole.ADMIN) throw new ConflictError("Admin accounts cannot be blocked", "ADMIN_USER")
  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.BLOCKED },
  })
}

export async function unblockUser(userId: string): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
  })
  if (count === 0) throw new NotFoundError("User not found", "USER_NOT_FOUND")
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await requireUserRole(userId)
  if (user.role === UserRole.ADMIN) throw new ForbiddenError("Cannot delete admin users", "ADMIN_USER")

  const soleOwnerLabIds = await getSoleOwnerLabIds(userId)
  if (soleOwnerLabIds.length > 0) {
    throw new ConflictError(
      "Cannot delete a user who is the sole owner of a lab. Delete the lab first.",
      "SOLE_LAB_OWNER",
      { labIds: soleOwnerLabIds },
    )
  }

  // Panels and experiments keep the User relation with onDelete: SetNull so public contributions stay
  // in place. Private ones would become unreachable orphans, so they go with the account.
  await prisma.$transaction([
    prisma.panel.deleteMany({ where: { ownerId: userId, visibility: Visibility.PRIVATE, owningLabId: null } }),
    prisma.experiment.deleteMany({ where: { submitterId: userId, visibility: Visibility.PRIVATE, owningLabId: null } }),
    prisma.rateLimit.deleteMany({ where: { userId } }),
    prisma.chatMessage.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
}

const userExportSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  status: true,
  orcid: true,
  institution: true,
  institutionId: true,
  createdAt: true,
  updatedAt: true,
  accounts: {
    select: { provider: true, providerAccountId: true, type: true, createdAt: true, updatedAt: true },
  },
  experiments: {
    include: {
      reports: { include: { cellTypes: true, validations: true, issues: true } },
      images: { include: { channels: true, cellTypes: true } },
    },
  },
  panels: {
    include: {
      cycles: { include: { markers: true } },
    },
  },
  labMemberships: {
    select: { labId: true, role: true, joinedAt: true, lab: { select: { name: true, slug: true } } },
  },
  labInvitesSent: {
    select: { id: true, labId: true, email: true, role: true, status: true, expiresAt: true, createdAt: true },
  },
  labInvitesAccepted: {
    select: { id: true, labId: true, email: true, role: true, status: true, acceptedAt: true },
  },
  labAntibodiesAdded: {
    select: {
      id: true,
      labId: true,
      antibodyId: true,
      storageLocation: true,
      lotNumber: true,
      status: true,
      notes: true,
      addedAt: true,
    },
  },
  chatConversations: {
    select: {
      id: true,
      title: true,
      model: true,
      createdAt: true,
      updatedAt: true,
      messages: { select: { id: true, role: true, content: true, model: true, createdAt: true } },
    },
  },
  apiCredentials: {
    select: { provider: true, label: true, last4: true, scope: true, createdAt: true },
  },
} satisfies Prisma.UserSelect

export type UserExportRow = Prisma.UserGetPayload<{ select: typeof userExportSelect }>

export async function getUserExport(userId: string): Promise<UserExportRow | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: userExportSelect })
}

export async function getAllUsers(page = 1, pageSize = 20, search?: string) {
  const where: Prisma.UserWhereInput = search
    ? {
        OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }],
      }
    : {}

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { panels: true, experiments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return { users, pagination: { page, pageSize, totalUsers, totalPages: Math.ceil(totalUsers / pageSize) } }
}
