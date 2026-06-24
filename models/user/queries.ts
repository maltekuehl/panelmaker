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
  const visibility = includeNonPublished
    ? { submitterId: userId, isPublic: true }
    : { submitterId: userId, isPublic: true, status: "PUBLISHED" as const }

  const [totalReports, publishedReports, pendingReports, publicPanels, methodRows, speciesRows] = await Promise.all([
    prisma.experimentalReport.count({ where: visibility }),
    prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true, status: "PUBLISHED" } }),
    includeNonPublished
      ? prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true, status: "PENDING" } })
      : Promise.resolve(0),
    prisma.panel.count({ where: { ownerId: userId, isPublic: true } }),
    prisma.experimentalReport.findMany({
      where: { ...visibility, method: { not: null } },
      select: { method: true },
      distinct: ["method"],
    }),
    prisma.experimentalReport.findMany({
      where: { ...visibility, speciesId: { not: null } },
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
  method: true,
  status: true,
  createdAt: true,
  species: { select: { id: true, label: true } },
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
  return prisma.experimentalReport.findMany({
    where: includeNonPublished
      ? { submitterId: userId, isPublic: true }
      : { submitterId: userId, isPublic: true, status: "PUBLISHED" },
    select: recentReportSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  }) as Promise<RecentReportRow[]>
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const grouped = await prisma.experimentalReport.groupBy({
    by: ["submitterId"],
    _count: { id: true },
    where: { isPublic: true, submitterId: { not: null } },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  })

  const userIds = grouped.map((g) => g.submitterId as string)

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true, institution: true },
  })

  const publishedCounts = await prisma.experimentalReport.groupBy({
    by: ["submitterId"],
    _count: { id: true },
    where: { isPublic: true, status: "PUBLISHED", submitterId: { in: userIds } },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))
  const publishedMap = new Map(publishedCounts.map((v) => [v.submitterId, v._count.id]))

  return grouped
    .map((g) => {
      const uid = g.submitterId as string
      const user = userMap.get(uid)
      return {
        userId: uid,
        name: user?.name ?? null,
        image: user?.image ?? null,
        institution: user?.institution ?? null,
        reportCount: g._count.id,
        publishedCount: publishedMap.get(uid) ?? 0,
      }
    })
    .filter((e) => userMap.has(e.userId))
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
