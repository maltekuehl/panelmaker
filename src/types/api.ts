export interface ModelUsageStats {
  modelName: string
  totalCalls: number
  totalTokens: number
}

export interface PeriodStats {
  totalMessages: number
  totalUsers: number
  modelUsage: ModelUsageStats[]
}

export interface StatsResponse {
  last7Days: PeriodStats
  last30Days: PeriodStats
  last365Days: PeriodStats
}
