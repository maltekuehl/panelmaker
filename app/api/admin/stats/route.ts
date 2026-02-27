import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { prisma } from "@/lib/prisma"
import { ModelUsageStats, PeriodStats, StatsResponse } from "@/types/api"
import { connection, NextRequest } from "next/server"

async function getStatsForPeriod(daysAgo: number): Promise<PeriodStats> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysAgo)

  const totalMessages = await prisma.chatMessage.count({
    where: { createdAt: { gte: startDate } },
  })

  const uniqueUsers = await prisma.chatMessage.findMany({
    where: {
      createdAt: { gte: startDate },
      userId: { not: null },
    },
    select: { userId: true },
    distinct: ["userId"],
  })

  const modelUsageData = await prisma.chatMessage.groupBy({
    by: ["modelName"],
    where: {
      createdAt: { gte: startDate },
      modelName: { not: null },
    },
    _count: { id: true },
    _sum: { totalTokens: true },
  })

  const modelUsage: ModelUsageStats[] = modelUsageData
    .map((item) => ({
      modelName: item.modelName || "unknown",
      totalCalls: item._count.id,
      totalTokens: item._sum.totalTokens || 0,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls)

  return {
    totalMessages,
    totalUsers: uniqueUsers.length,
    modelUsage,
  }
}

export const GET = createAuthHandler(async (request: NextRequest, user) => {
  await connection()
  const context = getRequestContext(request)
  logger.apiRequest("GET", "/api/admin/stats", { ...context, userId: user.id })

  try {
    const [last7Days, last30Days, last365Days] = await Promise.all([
      getStatsForPeriod(7),
      getStatsForPeriod(30),
      getStatsForPeriod(365),
    ])

    const response: StatsResponse = { last7Days, last30Days, last365Days }
    return createSuccessResponse(response)
  } catch (error) {
    logger.error("Failed to fetch statistics", error as Error, { userId: user.id })
    return createErrorResponse("Failed to fetch statistics")
  }
}, true)
