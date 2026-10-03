import { PROVIDER_LABELS, type KeySourceKind } from "./keys"
import { PROVIDER_IDS, type ProviderId } from "./schema"

export const CHAT_ERROR_CODES = [
  "UNAUTHENTICATED",
  "INVALID_REQUEST",
  "CONVERSATION_NOT_FOUND",
  "LAB_ACCESS_DENIED",
  "INVALID_MODEL",
  "NO_KEY_CONFIGURED",
  "KEY_UNREADABLE",
  "ENCRYPTION_NOT_CONFIGURED",
  "INSTANCE_LIMIT_REACHED",
  "PROVIDER_AUTH_FAILED",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_MODEL_NOT_FOUND",
  "PROVIDER_REQUEST_REJECTED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_ERROR",
  "INTERNAL",
] as const

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number]

export interface ChatErrorPayload {
  code: ChatErrorCode
  message: string
  provider?: ProviderId
  source?: KeySourceKind
  labName?: string
  resetAt?: string
}

const STATUS_BY_CODE: Record<ChatErrorCode, number> = {
  UNAUTHENTICATED: 401,
  INVALID_REQUEST: 400,
  CONVERSATION_NOT_FOUND: 404,
  LAB_ACCESS_DENIED: 403,
  INVALID_MODEL: 400,
  NO_KEY_CONFIGURED: 412,
  KEY_UNREADABLE: 503,
  ENCRYPTION_NOT_CONFIGURED: 503,
  INSTANCE_LIMIT_REACHED: 429,
  PROVIDER_AUTH_FAILED: 502,
  PROVIDER_RATE_LIMITED: 429,
  PROVIDER_MODEL_NOT_FOUND: 404,
  PROVIDER_REQUEST_REJECTED: 502,
  PROVIDER_UNAVAILABLE: 502,
  PROVIDER_ERROR: 502,
  INTERNAL: 500,
}

export function chatErrorStatus(code: ChatErrorCode): number {
  return STATUS_BY_CODE[code]
}

export class ChatError extends Error {
  readonly payload: ChatErrorPayload

  constructor(payload: Omit<ChatErrorPayload, "message"> & { message?: string }) {
    const message = payload.message ?? chatErrorMessage(payload)
    super(message)
    this.name = "ChatError"
    this.payload = { ...payload, message }
  }

  get status(): number {
    return chatErrorStatus(this.payload.code)
  }
}

function sourceName(payload: Pick<ChatErrorPayload, "source" | "labName">): string {
  switch (payload.source) {
    case "user":
      return "your key"
    case "lab":
      return `the ${payload.labName ?? "lab"} key`
    case "instance":
      return "the instance key"
    default:
      return "the configured key"
  }
}

function providerName(provider?: ProviderId): string {
  return provider ? PROVIDER_LABELS[provider] : "the provider"
}

// Friendly default copy per code. The server sends it along, and the client can rebuild it from the
// code alone when a plain-text error arrives mid-stream.
export function chatErrorMessage(payload: Omit<ChatErrorPayload, "message">): string {
  const provider = providerName(payload.provider)
  switch (payload.code) {
    case "UNAUTHENTICATED":
      return "Sign in to use the assistant."
    case "INVALID_REQUEST":
      return "The message could not be sent. Reload the page and try again."
    case "CONVERSATION_NOT_FOUND":
      return "This conversation no longer exists."
    case "LAB_ACCESS_DENIED":
      return "You are not a member of that lab, so its keys cannot be used."
    case "INVALID_MODEL":
      return "That model id is not supported. Pick a model from the list."
    case "NO_KEY_CONFIGURED":
      return `No API key is configured for ${provider}. Add your own key in settings, ask a lab admin to add a lab key, or ask the operator of this instance to configure one.`
    case "KEY_UNREADABLE":
      return `The stored ${provider} key cannot be decrypted. The server encryption key may have changed. Save the key again in settings.`
    case "ENCRYPTION_NOT_CONFIGURED":
      return "The server has no encryption key configured, so API keys cannot be stored. Ask the operator of this instance to set ENCRYPTION_KEY."
    case "INSTANCE_LIMIT_REACHED":
      return "You have reached today's limit for the instance key. Add your own key in settings to keep going, or try again tomorrow."
    case "PROVIDER_AUTH_FAILED":
      return `${provider} rejected ${sourceName(payload)}. It may be invalid or revoked. Replace it in settings.`
    case "PROVIDER_RATE_LIMITED":
      return `${provider} reports a rate limit or exhausted quota on ${sourceName(payload)}. Wait a moment or check the billing of that account.`
    case "PROVIDER_MODEL_NOT_FOUND":
      return `${provider} does not offer this model to ${sourceName(payload)}. Pick another model.`
    case "PROVIDER_REQUEST_REJECTED":
      return `${provider} rejected the request settings for this model. Try a different reasoning effort, or pick another model.`
    case "PROVIDER_UNAVAILABLE":
      return `${provider} could not be reached. Try again in a moment.`
    case "PROVIDER_ERROR":
      return `${provider} returned an error. Try again, or pick another model.`
    case "INTERNAL":
      return "Something went wrong on our side. Try again."
  }
}

export function serializeChatError(payload: ChatErrorPayload): string {
  return JSON.stringify({ error: payload })
}

function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === "string" && (CHAT_ERROR_CODES as readonly string[]).includes(value)
}

// useChat surfaces a non-2xx body or a stream error as `error.message`. Our server always sends a
// serialized payload; anything else (network failures, proxies) becomes a generic error.
export function parseChatError(text: string | undefined | null): ChatErrorPayload {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { error?: Partial<ChatErrorPayload> } | null
      const candidate = parsed?.error
      if (candidate && isChatErrorCode(candidate.code)) {
        const provider = PROVIDER_IDS.find((id) => id === candidate.provider)
        const payload = {
          code: candidate.code,
          provider,
          source: candidate.source,
          labName: candidate.labName,
          resetAt: candidate.resetAt,
        }
        return { ...payload, message: candidate.message || chatErrorMessage(payload) }
      }
    } catch {}
  }
  return { code: "INTERNAL", message: chatErrorMessage({ code: "INTERNAL" }) }
}

interface ErrorLike {
  name?: unknown
  message?: unknown
  statusCode?: unknown
  url?: unknown
  responseBody?: unknown
  lastError?: unknown
  cause?: unknown
}

function asErrorLike(value: unknown): ErrorLike | null {
  return value && typeof value === "object" ? (value as ErrorLike) : null
}

// Duck-typed on APICallError (statusCode, responseBody) and RetryError (lastError) so the mapping
// stays pure and testable without the SDK.
function unwrapProviderError(error: unknown): ErrorLike | null {
  let current = asErrorLike(error)
  for (let depth = 0; current && current.statusCode === undefined && depth < 4; depth += 1) {
    const next = asErrorLike(current.lastError) ?? asErrorLike(current.cause)
    if (!next) break
    current = next
  }
  return current
}

export function classifyProviderError(error: unknown): ChatErrorCode {
  const current = unwrapProviderError(error)
  if (!current) return "PROVIDER_ERROR"

  const status = typeof current.statusCode === "number" ? current.statusCode : undefined
  const text = `${String(current.message ?? "")} ${String(current.responseBody ?? "")}`.toLowerCase()
  const name = String(current.name ?? "")

  if (name.includes("NoSuchModel")) return "PROVIDER_MODEL_NOT_FOUND"
  if (status === 401 || status === 403) return "PROVIDER_AUTH_FAILED"
  if (text.includes("api key not valid") || text.includes("invalid api key") || text.includes("invalid x-api-key")) {
    return "PROVIDER_AUTH_FAILED"
  }
  if (status === 429 || text.includes("quota") || text.includes("rate limit")) return "PROVIDER_RATE_LIMITED"
  if (status === 404 || (text.includes("model") && (text.includes("not found") || text.includes("does not exist")))) {
    return "PROVIDER_MODEL_NOT_FOUND"
  }
  if (status === 400 || status === 422) return "PROVIDER_REQUEST_REJECTED"
  if (status !== undefined && status >= 500) return "PROVIDER_UNAVAILABLE"
  if (name.includes("Fetch") || text.includes("fetch failed") || text.includes("econnrefused")) {
    return "PROVIDER_UNAVAILABLE"
  }
  return "PROVIDER_ERROR"
}

export interface ProviderErrorDetails {
  name?: string
  statusCode?: number
  url?: string
  responseBody?: string
}

const MAX_LOGGED_BODY = 2000

function redactUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const param of ["key", "api_key", "apiKey"]) {
      if (url.searchParams.has(param)) url.searchParams.set(param, "REDACTED")
    }
    return url.toString()
  } catch {
    return value.replace(/([?&](?:key|api_key|apiKey)=)[^&]*/g, "$1REDACTED")
  }
}

// What the server log needs to diagnose a provider rejection (status, endpoint, the provider's own
// error body). API keys travel in headers, which are left out; any key in the query string is redacted.
export function describeProviderError(error: unknown): ProviderErrorDetails | null {
  const current = unwrapProviderError(error)
  if (!current || (current.statusCode === undefined && current.responseBody === undefined)) return null
  const body = typeof current.responseBody === "string" ? current.responseBody : undefined
  return {
    name: typeof current.name === "string" ? current.name : undefined,
    statusCode: typeof current.statusCode === "number" ? current.statusCode : undefined,
    url: typeof current.url === "string" ? redactUrl(current.url) : undefined,
    responseBody: body && body.length > MAX_LOGGED_BODY ? `${body.slice(0, MAX_LOGGED_BODY)}...` : body,
  }
}
