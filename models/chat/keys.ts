import { canDoLabAction, isLabMember, type ViewerContext } from "@/models/lab/access"
import { PROVIDER_IDS, type ProviderId } from "./schema"

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
}

export type KeySourceKind = "user" | "lab" | "instance"

export interface KeySource {
  kind: KeySourceKind
  labId?: string
  labName?: string
}

export interface LabKeyInventory {
  id: string
  name: string
  slug: string
  canManage: boolean
  providers: ProviderId[]
}

// Which providers have a usable key at each level for one viewer. Only labs the viewer belongs to are
// ever listed, so a lab key can never leak to a non-member through this shape.
export interface KeyInventory {
  user: ProviderId[]
  labs: LabKeyInventory[]
  instance: ProviderId[]
}

export interface ModelOption {
  id: string
  label: string
  provider: ProviderId
}

export interface ModelAvailability extends ModelOption {
  source: KeySource | null
}

// What a chat surface needs to render the model picker and explain which key a turn will use.
export interface ChatSetupData {
  models: ModelAvailability[]
  inventory: KeyInventory
  labContextId: string | null
  selectedModel: string
  defaultModel: string
}

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value)
}

// "provider:model". A bare id (no colon) is treated as a Google model for backwards compatibility.
export function parseModelId(modelId: string): { provider: ProviderId; model: string } | null {
  const trimmed = modelId.trim()
  const idx = trimmed.indexOf(":")
  if (idx === -1) return trimmed ? { provider: "google", model: trimmed } : null
  const provider = trimmed.slice(0, idx)
  const model = trimmed.slice(idx + 1)
  if (!isProviderId(provider) || !model) return null
  return { provider, model }
}

export function canUseLabCredential(viewer: ViewerContext | null, labId: string): boolean {
  return Boolean(viewer && isLabMember(viewer, labId))
}

export function canManageLabCredentials(viewer: ViewerContext | null, labId: string): boolean {
  return Boolean(viewer && canDoLabAction(viewer.roleByLab[labId], "manage_api_keys"))
}

export type LabContextResult = { ok: true; labId: string | null } | { ok: false; code: "LAB_ACCESS_DENIED" }

// The lab whose shared keys a chat turn may use. An explicitly requested lab must be one the viewer
// belongs to; a lab stored on the conversation is silently dropped once the viewer leaves it; otherwise
// the viewer's first lab (by join date) is the default.
export function resolveLabContext(
  viewer: ViewerContext | null,
  requested?: string | null,
  stored?: string | null,
): LabContextResult {
  if (!viewer) return { ok: true, labId: null }
  if (requested) {
    return isLabMember(viewer, requested) ? { ok: true, labId: requested } : { ok: false, code: "LAB_ACCESS_DENIED" }
  }
  if (stored && isLabMember(viewer, stored)) return { ok: true, labId: stored }
  return { ok: true, labId: viewer.labIds[0] ?? null }
}

// Every key that could serve the provider, in precedence order: the viewer's own key, then the key of
// the lab the chat is acting in, then the instance key configured by the operator.
export function rankKeySources(
  provider: ProviderId,
  inventory: KeyInventory,
  labContextId: string | null,
): KeySource[] {
  const sources: KeySource[] = []
  if (inventory.user.includes(provider)) sources.push({ kind: "user" })
  const lab = labContextId ? inventory.labs.find((entry) => entry.id === labContextId) : undefined
  if (lab?.providers.includes(provider)) sources.push({ kind: "lab", labId: lab.id, labName: lab.name })
  if (inventory.instance.includes(provider)) sources.push({ kind: "instance" })
  return sources
}

export function pickKeySource(
  provider: ProviderId,
  inventory: KeyInventory,
  labContextId: string | null,
): KeySource | null {
  return rankKeySources(provider, inventory, labContextId)[0] ?? null
}

export function describeKeySource(source: KeySource): string {
  switch (source.kind) {
    case "user":
      return "Using your key"
    case "lab":
      return `Using ${source.labName ?? "lab"} key`
    case "instance":
      return "Using the instance key"
  }
}

export function annotateModels(
  models: ModelOption[],
  inventory: KeyInventory,
  labContextId: string | null,
): ModelAvailability[] {
  return models.map((model) => ({ ...model, source: pickKeySource(model.provider, inventory, labContextId) }))
}

// The first preference that is actually runnable wins; failing that, the first runnable model in the
// catalog; failing that, the first preference, so the UI can explain what is missing for it.
export function chooseDefaultModel(
  preferences: (string | null | undefined)[],
  models: ModelAvailability[],
  fallback: string,
): string {
  const wanted = preferences.filter((id): id is string => Boolean(id))
  const runnable = new Set(models.filter((model) => model.source).map((model) => model.id))
  const preferred = wanted.find((id) => runnable.has(id))
  if (preferred) return preferred
  const firstRunnable = models.find((model) => model.source)
  if (firstRunnable) return firstRunnable.id
  return wanted[0] ?? fallback
}

export function groupModelsByProvider<T extends ModelOption>(models: T[]): { provider: ProviderId; models: T[] }[] {
  return PROVIDER_IDS.map((provider) => ({
    provider,
    models: models.filter((model) => model.provider === provider),
  })).filter((group) => group.models.length > 0)
}

export function modelLabel(modelId: string, catalog: ModelOption[]): string {
  return catalog.find((model) => model.id === modelId)?.label ?? parseModelId(modelId)?.model ?? modelId
}
