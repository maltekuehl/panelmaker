// API request and response type definitions

import { UIMessage } from "ai"

export interface ChatRequest {
  messages: UIMessage[]
  apiKey?: string
  selectedModel?: string
}

export interface BlockUserRequest {
  action: "block" | "unblock"
}

export interface BlogResponse {
  blogPost?: {
    slug: string
  }
}

export interface ApiError {
  error: string
}

// Admin stats types
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

// Type guard functions
export function isChatRequest(obj: unknown): obj is ChatRequest {
  return typeof obj === "object" && obj !== null && "messages" in obj && Array.isArray((obj as any).messages)
}

export function isBlockUserRequest(obj: unknown): obj is BlockUserRequest {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "action" in obj &&
    typeof (obj as any).action === "string" &&
    ["block", "unblock"].includes((obj as any).action)
  )
}

export function hasErrorProperty(obj: unknown): obj is { error: string } {
  return typeof obj === "object" && obj !== null && "error" in obj && typeof (obj as any).error === "string"
}

export function hasBlogPostProperty(obj: unknown): obj is BlogResponse {
  return typeof obj === "object" && obj !== null && "blogPost" in obj
}
