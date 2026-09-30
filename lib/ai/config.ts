import "server-only"

import { env } from "@/lib/env"
import { PROVIDER_IDS, type ProviderId } from "@/models/chat/schema"

export function getInstanceKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case "google":
      return env.GOOGLE_GENERATIVE_AI_API_KEY || undefined
    case "openai":
      return env.OPENAI_API_KEY || undefined
    case "anthropic":
      return env.ANTHROPIC_API_KEY || undefined
  }
}

export function getInstanceProviders(): ProviderId[] {
  return PROVIDER_IDS.filter((provider) => Boolean(getInstanceKey(provider)))
}

// Per-user requests per 24 hours on the instance keys; 0 means unlimited. The cast covers the dev
// fallback in lib/env.ts, which hands back raw strings when validation fails.
export function getInstanceDailyLimit(fallback: number): number {
  const raw = env.AI_INSTANCE_DAILY_LIMIT as number | string | undefined
  if (raw === undefined || raw === "") return fallback
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function getConfiguredDefaultModel(): string | undefined {
  return env.AI_DEFAULT_MODEL || undefined
}
