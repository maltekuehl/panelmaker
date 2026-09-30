import "server-only"

import { getConfiguredDefaultModel } from "@/lib/ai/config"
import {
  annotateModels,
  ChatError,
  chooseDefaultModel,
  getKeyInventory,
  parseModelId,
  PROVIDER_IDS,
  resolveProviderKey,
  type ChatSetupData,
  type KeySource,
  type ModelOption,
  type ProviderId,
} from "@/models/chat"
import type { ViewerContext } from "@/models/lab/access"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export type { ModelOption, ProviderId }

export const PROVIDERS: readonly ProviderId[] = PROVIDER_IDS

// Used when the operator does not set AI_DEFAULT_MODEL.
export const DEFAULT_MODEL = "google:gemini-3.5-flash-lite"

// A small curated catalog. Any "provider:model" string still works at request time even if it is
// not listed here, so new models do not require a code change.
export const BUILTIN_MODELS: ModelOption[] = [
  { id: "google:gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", provider: "google" },
  { id: "google:gemini-3.8-flash", label: "Gemini 3.8 Flash", provider: "google" },
  { id: "openai:gpt-5.5", label: "GPT-5.5", provider: "openai" },
  { id: "anthropic:claude-sonnet-5-5", label: "Claude Sonnet 5.5", provider: "anthropic" },
]

export function getDefaultModel(): string {
  return getConfiguredDefaultModel() ?? DEFAULT_MODEL
}

// The curated catalog plus the operator's default model when it is not already listed.
export function getModelCatalog(): ModelOption[] {
  const defaultModel = getDefaultModel()
  if (BUILTIN_MODELS.some((option) => option.id === defaultModel)) return BUILTIN_MODELS
  const parsed = parseModelId(defaultModel)
  if (!parsed) return BUILTIN_MODELS
  return [{ id: defaultModel, label: parsed.model, provider: parsed.provider }, ...BUILTIN_MODELS]
}

export function createProviderModel(provider: ProviderId, model: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "google":
      return createGoogle({ apiKey })(model)
    case "openai":
      return createOpenAI({ apiKey })(model)
    case "anthropic":
      return createAnthropic({ apiKey })(model)
  }
}

export interface ResolvedModel {
  model: LanguageModel
  modelId: string
  provider: ProviderId
  source: KeySource
  credentialId: string | null
}

// Resolve a model plus the key it runs on (precedence lives in rankKeySources: the viewer's own key,
// then the key of the lab the chat acts in, then the instance key). Throws a ChatError otherwise.
export async function resolveLanguageModel(
  modelId: string,
  viewer: ViewerContext | null,
  labContextId: string | null,
): Promise<ResolvedModel> {
  const parsed = parseModelId(modelId)
  if (!parsed) throw new ChatError({ code: "INVALID_MODEL" })
  const result = await resolveProviderKey(parsed.provider, viewer, labContextId)
  if (!result.ok) throw new ChatError({ code: result.code, provider: parsed.provider })
  const { key, source, credentialId } = result.resolved
  return {
    model: createProviderModel(parsed.provider, parsed.model, key),
    modelId,
    provider: parsed.provider,
    source,
    credentialId,
  }
}

// Everything a chat surface needs to render the model picker and the key source for one viewer.
export async function getChatSetup(
  viewer: ViewerContext | null,
  opts: { labContextId: string | null; preferredModels: (string | null | undefined)[] },
): Promise<ChatSetupData> {
  const inventory = await getKeyInventory(viewer)
  const defaultModel = getDefaultModel()
  const catalog = getModelCatalog()
  const unlisted = new Set(
    opts.preferredModels.filter((id): id is string => Boolean(id) && !catalog.some((option) => option.id === id)),
  )
  const extra = [...unlisted].flatMap((id) => {
    const parsed = parseModelId(id)
    return parsed ? [{ id, label: parsed.model, provider: parsed.provider }] : []
  })
  const models = annotateModels([...catalog, ...extra], inventory, opts.labContextId)
  return {
    models,
    inventory,
    labContextId: opts.labContextId,
    selectedModel: chooseDefaultModel([...opts.preferredModels, defaultModel], models, defaultModel),
    defaultModel,
  }
}
