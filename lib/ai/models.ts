import "server-only"

import { resolveProviderKey } from "@/models/chat"
import type { ViewerContext } from "@/models/lab/access"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export type ProviderId = "google" | "openai" | "anthropic" | "groq"

export const PROVIDERS: ProviderId[] = ["google", "openai", "anthropic", "groq"]

// Model ids follow the "provider:model" convention, e.g. "google:gemini-3.1-flash-lite".
// A bare id (no colon) defaults to the google provider.
export const DEFAULT_MODEL = "google:gemini-3.1-flash-lite"

export interface ModelOption {
  id: string
  label: string
  provider: ProviderId
}

// A small curated catalog. Any "provider:model" string still works at request time even if it is
// not listed here, so new models do not require a code change.
export const BUILTIN_MODELS: ModelOption[] = [
  { id: "google:gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", provider: "google" },
  { id: "google:gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "google" },
  { id: "openai:gpt-5.1", label: "GPT-5.1", provider: "openai" },
  { id: "anthropic:claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq" },
]

export function parseModelId(modelId: string): { provider: ProviderId; model: string } {
  const idx = modelId.indexOf(":")
  if (idx === -1) return { provider: "google", model: modelId }
  const provider = modelId.slice(0, idx) as ProviderId
  return { provider, model: modelId.slice(idx + 1) }
}

// Resolve the API key for a provider. Precedence (handled in resolveProviderKey) is the viewer's own
// encrypted credential, then a lab credential, then the community env key (Google only).
async function getProviderKey(provider: ProviderId, viewer: ViewerContext | null): Promise<string | undefined> {
  return resolveProviderKey(provider, viewer)
}

export async function hasProviderKey(provider: ProviderId, viewer: ViewerContext | null): Promise<boolean> {
  return Boolean(await getProviderKey(provider, viewer))
}

export async function resolveLanguageModel(modelId: string, viewer: ViewerContext | null): Promise<LanguageModel> {
  const { provider, model } = parseModelId(modelId)
  const apiKey = await getProviderKey(provider, viewer)
  if (!apiKey) {
    throw new Error(`No API key available for ${provider}. Add one in settings to use this model.`)
  }
  switch (provider) {
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model)
    case "openai":
      return createOpenAI({ apiKey })(model)
    case "anthropic":
      return createAnthropic({ apiKey })(model)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// The models the viewer can actually run (i.e. a key is available for the provider).
export async function listAvailableModels(viewer: ViewerContext | null): Promise<ModelOption[]> {
  const available = await Promise.all(
    PROVIDERS.map(async (provider) => ((await hasProviderKey(provider, viewer)) ? provider : null)),
  )
  const enabled = new Set(available.filter((provider): provider is ProviderId => provider !== null))
  return BUILTIN_MODELS.filter((option) => enabled.has(option.provider))
}
