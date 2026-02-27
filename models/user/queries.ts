import "server-only"

import { prisma } from "@/lib/prisma"

const userProfileSelect = {
  id: true,
  name: true,
  image: true,
  institution: true,
  orcid: true,
  createdAt: true,
} as const

export type UserProfileRow = {
  id: string
  name: string | null
  image: string | null
  institution: string | null
  orcid: string | null
  createdAt: Date
}

export type UserStats = {
  totalReports: number
  validatedReports: number
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
  validatedCount: number
}

export type InstitutionEntry = {
  institution: string
  contributorCount: number
  reportCount: number
}

export async function getUserProfile(userId: string): Promise<UserProfileRow | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect,
  })
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const [totalReports, validatedReports, pendingReports, publicPanels, methodRows, speciesRows] = await Promise.all([
    prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true } }),
    prisma.experimentalReport.count({ where: { submitterId: userId, isPublic: true, status: "VALIDATED" } }),
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
    validatedReports,
    pendingReports,
    publicPanels,
    methods: methodRows.map((r) => r.method as string),
    species: speciesRows.map((r) => r.species as string),
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
  method: string | null
  species: string | null
  status: string
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

  const validatedCounts = await prisma.experimentalReport.groupBy({
    by: ["submitterId"],
    _count: { id: true },
    where: { isPublic: true, status: "VALIDATED", submitterId: { in: userIds } },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))
  const validatedMap = new Map(validatedCounts.map((v) => [v.submitterId, v._count.id]))

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
        validatedCount: validatedMap.get(uid) ?? 0,
      }
    })
    .filter((e) => userMap.has(e.userId))
}

export async function updateUserProfile(
  userId: string,
  data: { orcid?: string | null; institution?: string | null },
): Promise<UserProfileRow> {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: userProfileSelect,
  })
}

export async function getInstitutionLeaderboard(limit = 30): Promise<InstitutionEntry[]> {
  const results = await prisma.$queryRaw<{ institution: string; contributorCount: bigint; reportCount: bigint }[]>`
    SELECT u.institution,
           COUNT(DISTINCT u.id) as contributorCount,
           COUNT(er.id) as reportCount
    FROM User u
    JOIN ExperimentalReport er ON er.submitterId = u.id
    WHERE u.institution IS NOT NULL
      AND er.isPublic = 1
    GROUP BY u.institution
    ORDER BY reportCount DESC
    LIMIT ${limit}
  `

  return results.map((r) => ({
    institution: r.institution,
    contributorCount: Number(r.contributorCount),
    reportCount: Number(r.reportCount),
  }))
}
