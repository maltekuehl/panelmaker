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

export interface ReviewRequest {
  name: string
  reviewBody: string
  isHelpful: boolean
}

export interface ReviewApprovalRequest {
  action: "approve" | "delete" | "delete_and_block"
}

export interface ReviewResponse {
  review?: {
    id: string
    name: string
    reviewBody: string
    isHelpful: boolean
    datePublished: string
    isPending: boolean
    isApproved: boolean
  }
}

export interface ReviewsResponse {
  reviews: any[]
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

export function isReviewRequest(obj: unknown): obj is ReviewRequest {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "reviewBody" in obj &&
    "isHelpful" in obj &&
    typeof (obj as any).name === "string" &&
    typeof (obj as any).reviewBody === "string" &&
    typeof (obj as any).isHelpful === "boolean"
  )
}

export function isReviewApprovalRequest(obj: unknown): obj is ReviewApprovalRequest {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "action" in obj &&
    typeof (obj as any).action === "string" &&
    ["approve", "delete", "delete_and_block"].includes((obj as any).action)
  )
}

export function hasErrorProperty(obj: unknown): obj is { error: string } {
  return typeof obj === "object" && obj !== null && "error" in obj && typeof (obj as any).error === "string"
}

export function hasBlogPostProperty(obj: unknown): obj is BlogResponse {
  return typeof obj === "object" && obj !== null && "blogPost" in obj
}

export function hasReviewProperty(obj: unknown): obj is ReviewResponse {
  return typeof obj === "object" && obj !== null && "review" in obj
}

export function hasReviewsProperty(obj: unknown): obj is ReviewsResponse {
  return typeof obj === "object" && obj !== null && "reviews" in obj && Array.isArray((obj as any).reviews)
}
