import "server-only"

import type { ProviderId } from "@/models/chat/schema"

export type KeyCheckResult = "VALID" | "INVALID" | "RATE_LIMITED" | "UNREACHABLE"

const TIMEOUT_MS = 8000

// Listing models is free on all three providers and only needs a valid key, so it is the cheapest
// possible authenticated call.
function modelListRequest(provider: ProviderId, apiKey: string): { url: string; headers: Record<string, string> } {
  switch (provider) {
    case "google":
      return {
        url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
        headers: { "x-goog-api-key": apiKey },
      }
    case "openai":
      return { url: "https://api.openai.com/v1/models", headers: { Authorization: `Bearer ${apiKey}` } }
    case "anthropic":
      return {
        url: "https://api.anthropic.com/v1/models?limit=1",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      }
  }
}

export async function verifyProviderKey(provider: ProviderId, apiKey: string): Promise<KeyCheckResult> {
  const { url, headers } = modelListRequest(provider, apiKey)
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" })
    if (response.ok) return "VALID"
    if (response.status === 429) return "RATE_LIMITED"
    if (response.status === 400 || response.status === 401 || response.status === 403) return "INVALID"
    return "UNREACHABLE"
  } catch {
    return "UNREACHABLE"
  }
}
