import "server-only"

import { prisma } from "@/lib/prisma"
import type { MultiplexMethod, Species, ValidationStatus } from "@prisma/client"

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
  species: Species[]
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

export async function getUserStats(userId: string): Promise<UserStats> {
  const [totalReports, publishedReports, pendingReports, publicPanels, methodRows, speciesRows] = await Promise.all([
    prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true } }),
    prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true, status: "PUBLISHED" } }),
    prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true, status: "PENDING" } }),
    prisma.panel.count({ where: { ownerId: userId, isPublic: true } }),
    prisma.experimentalReport.findMany({
      where: { submitterId: userId, isPublic: true, method: { not: null } },
      select: { method: true },
      distinct: ["method"],
    }),
    prisma.experimentalReport.findMany({
      where: { submitterId: userId, isPublic: true, species: { not: null } },
      select: { species: true },
      distinct: ["species"],
    }),
  ])

  return {
    totalReports,
    publishedReports,
    pendingReports,
    publicPanels,
    methods: methodRows.map((r) => r.method!),
    species: speciesRows.map((r) => r.species!),
  }
}

const recentReportSelect = {
  id: true,
  method: true,
  species: true,
  status: true,
  createdAt: true,
  antibody: {
    select: {
      id: true,
      name: true,
      rrid: true,
      targetName: true,
      targetProteinId: true,
    },
  },
  cellType: {
    select: {
      id: true,
      label: true,
    },
  },
} as const

export type RecentReportRow = {
  id: number
  method: MultiplexMethod | null
  species: Species | null
  status: ValidationStatus
  createdAt: Date
  antibody: {
    id: number
    name: string
    rrid: string | null
    targetName: string | null
    targetProteinId: string | null
  } | null
  cellType: {
    id: string
    label: string
  } | null
}

export async function getUserRecentReports(userId: string, limit = 10): Promise<RecentReportRow[]> {
  return prisma.experimentalReport.findMany({
    where: { submitterId: userId, isPublic: true },
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
