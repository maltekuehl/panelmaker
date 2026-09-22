import "server-only"

import {
  listAvailableProviders,
  PROVIDER_IDS,
  resolveProviderKey,
  type KeySource,
  type ProviderId,
} from "@/models/chat"
import type { ViewerContext } from "@/models/lab/access"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export type { ProviderId }

export const PROVIDERS: readonly ProviderId[] = PROVIDER_IDS

// Model ids follow the "provider:model" convention, e.g. "google:gemini-3.5-flash-lite".
// A bare id (no colon) defaults to the google provider.
export const DEFAULT_MODEL = "google:gemini-3.5-flash-lite"

export interface ModelOption {
  id: string
  label: string
  provider: ProviderId
}

// A small curated catalog. Any "provider:model" string still works at request time even if it is
// not listed here, so new models do not require a code change.
export const BUILTIN_MODELS: ModelOption[] = [
  { id: "google:gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", provider: "google" },
  { id: "google:gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "google" },
  { id: "openai:gpt-5.5", label: "GPT-5.5", provider: "openai" },
  { id: "anthropic:claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic" },
]

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value)
}

export function parseModelId(modelId: string): { provider: ProviderId; model: string } {
  const idx = modelId.indexOf(":")
  if (idx === -1) return { provider: "google", model: modelId }
  const provider = modelId.slice(0, idx)
  if (!isProviderId(provider)) throw new Error(`Unsupported provider: ${provider}`)
  return { provider, model: modelId.slice(idx + 1) }
}

export interface ResolvedModel {
  model: LanguageModel
  keySource: KeySource
}

// Resolve a model plus the key it runs on. Precedence (handled in resolveProviderKey) is the viewer's
// own encrypted credential, then a lab credential, then the community env key (Google only).
export async function resolveLanguageModel(modelId: string, viewer: ViewerContext | null): Promise<ResolvedModel> {
  const { provider, model } = parseModelId(modelId)
  const resolved = await resolveProviderKey(provider, viewer)
  if (!resolved) {
    throw new Error(`No API key available for ${provider}. Add one in settings to use this model.`)
  }
  const apiKey = resolved.key
  switch (provider) {
    case "google":
      return { model: createGoogleGenerativeAI({ apiKey })(model), keySource: resolved.source }
    case "openai":
      return { model: createOpenAI({ apiKey })(model), keySource: resolved.source }
    case "anthropic":
      return { model: createAnthropic({ apiKey })(model), keySource: resolved.source }
  }
}

// The models the viewer can actually run (i.e. a key is available for the provider).
export async function listAvailableModels(viewer: ViewerContext | null): Promise<ModelOption[]> {
  const enabled = await listAvailableProviders(viewer)
  return BUILTIN_MODELS.filter((option) => enabled.has(option.provider))
}
