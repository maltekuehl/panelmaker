import "server-only"

import type { MultiplexMethod, ValidationStatus } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

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
  methods: MultiplexMethod[]
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
      where: { submitterId: userId, visibility: "PUBLIC", method: { not: null } },
      select: { method: true },
      distinct: ["method"],
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
    methods: methodRows.map((r) => r.method!),
    species: speciesRows.map((r) => r.species?.label).filter((l): l is string => l != null),
  }
}

const recentReportSelect = {
  id: true,
  status: true,
  createdAt: true,
  experiment: { select: { method: true, species: { select: { id: true, label: true } } } },
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
  method: MultiplexMethod | null
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
    method: r.experiment.method,
    species: r.experiment.species,
    status: r.status,
    createdAt: r.createdAt,
    antibody: r.antibody,
    cellTypes: r.cellTypes,
  }))
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const experiments = await prisma.experiment.findMany({
    where: { visibility: "PUBLIC", submitterId: { not: null } },
    select: { submitterId: true, reports: { select: { status: true } } },
  })

  const tally = new Map<string, { reportCount: number; publishedCount: number }>()
  for (const exp of experiments) {
    const uid = exp.submitterId as string
    const current = tally.get(uid) ?? { reportCount: 0, publishedCount: 0 }
    current.reportCount += exp.reports.length
    current.publishedCount += exp.reports.filter((r) => r.status === "PUBLISHED").length
    tally.set(uid, current)
  }

  const ranked = [...tally.entries()].sort((a, b) => b[1].reportCount - a[1].reportCount).slice(0, limit)

  const userIds = ranked.map(([uid]) => uid)

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true, institution: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  return ranked
    .filter(([uid]) => userMap.has(uid))
    .map(([uid, counts]) => {
      const user = userMap.get(uid)
      return {
        userId: uid,
        name: user?.name ?? null,
        image: user?.image ?? null,
        institution: user?.institution ?? null,
        reportCount: counts.reportCount,
        publishedCount: counts.publishedCount,
      }
    })
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
