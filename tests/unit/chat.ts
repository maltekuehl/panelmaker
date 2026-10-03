// Standalone assertions for the chat helpers: encryption round-trip, message transforms, API key
// precedence and access checks, and provider error mapping.
// Run with: npx tsx tests/unit/chat.ts
// lib/crypto imports "server-only" (resolved by Next, not Node), so we stub it before importing crypto.
import type { UIMessage } from "ai"
import assert from "node:assert/strict"
import Module, { createRequire } from "node:module"
import {
  ChatError,
  chatErrorStatus,
  classifyProviderError,
  describeProviderError,
  parseChatError,
  serializeChatError,
} from "../../src/models/chat/errors"
import {
  annotateModels,
  canManageLabCredentials,
  canUseLabCredential,
  chooseDefaultModel,
  describeKeySource,
  groupModelsByProvider,
  parseModelId,
  pickKeySource,
  rankKeySources,
  resolveLabContext,
  type KeyInventory,
  type ModelOption,
} from "../../src/models/chat/keys"
import { deriveRole, storedMessageId } from "../../src/models/chat/transforms"
import type { ViewerContext } from "../../src/models/lab/access"
import { check, finish } from "./harness"

const moduleLoader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown }
const originalLoad = moduleLoader._load
moduleLoader._load = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return {}
  return originalLoad.call(this, request, ...rest)
}

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "unit-test-encryption-key-0123456789abcdef"

const localRequire = createRequire(__filename)
const { decryptSecret, encryptSecret, isEncryptionConfigured, maskSecret } = localRequire(
  "../../src/lib/crypto",
) as typeof import("../../src/lib/crypto")

check("crypto round-trips a secret", () => {
  const secret = "sk-test-ABCDEF1234567890"
  const blob = encryptSecret(secret)
  assert.notEqual(blob, secret)
  assert.equal(blob.split(":").length, 3)
  assert.equal(decryptSecret(blob), secret)
})

check("crypto uses a random IV (distinct ciphertexts for the same input)", () => {
  const a = encryptSecret("same-secret")
  const b = encryptSecret("same-secret")
  assert.notEqual(a, b)
  assert.equal(decryptSecret(a), "same-secret")
  assert.equal(decryptSecret(b), "same-secret")
})

check("crypto rejects tampered ciphertext (GCM auth tag)", () => {
  const blob = encryptSecret("secret")
  const [iv, tag] = blob.split(":")
  const tampered = [iv, tag, Buffer.from("totally-different-data").toString("base64")].join(":")
  assert.throws(() => decryptSecret(tampered))
})

check("maskSecret returns the last 4 characters", () => {
  assert.equal(maskSecret("sk-abcdef7890"), "7890")
})

check("isEncryptionConfigured reflects ENCRYPTION_KEY", () => {
  assert.equal(isEncryptionConfigured(), true)
})

const userMsg = { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] } as unknown as UIMessage
const assistantMsg = { id: "m2", role: "assistant", parts: [] } as unknown as UIMessage
const systemMsg = { id: "m3", role: "system", parts: [] } as unknown as UIMessage

check("deriveRole maps UIMessage roles to the Prisma enum", () => {
  assert.equal(deriveRole(userMsg), "USER")
  assert.equal(deriveRole(assistantMsg), "ASSISTANT")
  assert.equal(deriveRole(systemMsg), "SYSTEM")
})

check("storedMessageId extracts the id and tolerates garbage", () => {
  assert.equal(storedMessageId(JSON.stringify(userMsg)), "m1")
  assert.equal(storedMessageId("not json"), null)
  assert.equal(storedMessageId(JSON.stringify({ role: "user" })), null)
})

// ─── Key precedence and access ────────────────────────────────────────

const puelles = { id: "lab-puelles", name: "Puelles Lab", slug: "puelles-lab", canManage: true }
const nolan = { id: "lab-nolan", name: "Nolan Lab", slug: "nolan-lab", canManage: false }

const viewer: ViewerContext = {
  userId: "user-1",
  labIds: [puelles.id, nolan.id],
  roleByLab: { [puelles.id]: "ADMIN", [nolan.id]: "MEMBER" },
  isAdmin: false,
}

function inventory(overrides: Partial<KeyInventory> = {}): KeyInventory {
  return {
    user: [],
    labs: [
      { ...puelles, providers: ["anthropic"] },
      { ...nolan, providers: ["anthropic", "openai"] },
    ],
    instance: ["google"],
    ...overrides,
  }
}

check("user key beats lab key beats instance key", () => {
  const all = inventory({ user: ["anthropic"], instance: ["anthropic"] })
  assert.deepEqual(
    rankKeySources("anthropic", all, puelles.id).map((source) => source.kind),
    ["user", "lab", "instance"],
  )
  assert.equal(pickKeySource("anthropic", all, puelles.id)?.kind, "user")
  assert.equal(pickKeySource("anthropic", inventory({ instance: ["anthropic"] }), puelles.id)?.kind, "lab")
  assert.equal(pickKeySource("google", inventory(), puelles.id)?.kind, "instance")
})

check("only the lab the chat acts in contributes its key", () => {
  assert.equal(pickKeySource("openai", inventory(), puelles.id), null)
  const source = pickKeySource("openai", inventory(), nolan.id)
  assert.equal(source?.kind, "lab")
  assert.equal(source?.labId, nolan.id)
  assert.equal(pickKeySource("anthropic", inventory(), null), null)
})

check("no key anywhere resolves to null", () => {
  assert.equal(pickKeySource("openai", inventory({ labs: [] }), null), null)
})

check("describeKeySource names the source", () => {
  assert.equal(describeKeySource({ kind: "user" }), "Using your key")
  assert.equal(describeKeySource({ kind: "lab", labId: puelles.id, labName: "Puelles Lab" }), "Using Puelles Lab key")
  assert.equal(describeKeySource({ kind: "instance" }), "Using the instance key")
})

check("lab credentials are usable by members only", () => {
  assert.equal(canUseLabCredential(viewer, puelles.id), true)
  assert.equal(canUseLabCredential(viewer, "lab-other"), false)
  assert.equal(canUseLabCredential(null, puelles.id), false)
})

check("lab credentials are managed by admins and owners only", () => {
  assert.equal(canManageLabCredentials(viewer, puelles.id), true)
  assert.equal(canManageLabCredentials(viewer, nolan.id), false)
  assert.equal(canManageLabCredentials(viewer, "lab-other"), false)
  const owner: ViewerContext = { ...viewer, roleByLab: { [nolan.id]: "OWNER" } }
  assert.equal(canManageLabCredentials(owner, nolan.id), true)
  const readOnly: ViewerContext = { ...viewer, roleByLab: { [nolan.id]: "VIEWER" } }
  assert.equal(canManageLabCredentials(readOnly, nolan.id), false)
})

check("resolveLabContext rejects labs the viewer is not in", () => {
  assert.deepEqual(resolveLabContext(viewer, "lab-other", null), { ok: false, code: "LAB_ACCESS_DENIED" })
  assert.deepEqual(resolveLabContext(viewer, nolan.id, puelles.id), { ok: true, labId: nolan.id })
})

check("resolveLabContext falls back from a stale stored lab to the first lab", () => {
  assert.deepEqual(resolveLabContext(viewer, undefined, nolan.id), { ok: true, labId: nolan.id })
  assert.deepEqual(resolveLabContext(viewer, undefined, "lab-left"), { ok: true, labId: puelles.id })
  assert.deepEqual(resolveLabContext({ ...viewer, labIds: [], roleByLab: {} }, undefined, null), {
    ok: true,
    labId: null,
  })
  assert.deepEqual(resolveLabContext(null, "lab-other", null), { ok: true, labId: null })
})

const catalog: ModelOption[] = [
  { id: "google:gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", provider: "google" },
  { id: "openai:gpt-5.5", label: "GPT-5.5", provider: "openai" },
  { id: "anthropic:claude-sonnet-5-5", label: "Claude Sonnet 4.6", provider: "anthropic" },
]

check("annotateModels marks what each model would run on", () => {
  const models = annotateModels(catalog, inventory(), puelles.id)
  assert.equal(models[0]?.source?.kind, "instance")
  assert.equal(models[1]?.source, null)
  assert.equal(models[2]?.source?.labName, "Puelles Lab")
})

check("chooseDefaultModel prefers a runnable preference, then any runnable model", () => {
  const models = annotateModels(catalog, inventory(), puelles.id)
  assert.equal(chooseDefaultModel(["anthropic:claude-sonnet-5-5"], models, "x"), "anthropic:claude-sonnet-5-5")
  assert.equal(chooseDefaultModel(["openai:gpt-5.5", null], models, "x"), "google:gemini-3.5-flash-lite")
  const none = annotateModels(catalog, { user: [], labs: [], instance: [] }, null)
  assert.equal(chooseDefaultModel([undefined, "openai:gpt-5.5"], none, "x"), "openai:gpt-5.5")
  assert.equal(chooseDefaultModel([], none, "fallback:model"), "fallback:model")
})

check("groupModelsByProvider keeps provider order and drops empty groups", () => {
  const groups = groupModelsByProvider(catalog.filter((model) => model.provider !== "openai"))
  assert.deepEqual(
    groups.map((group) => group.provider),
    ["google", "anthropic"],
  )
})

check("parseModelId handles provider prefixes and bare ids", () => {
  assert.deepEqual(parseModelId("openai:gpt-5.5"), { provider: "openai", model: "gpt-5.5" })
  assert.deepEqual(parseModelId("gemini-3.5-flash"), { provider: "google", model: "gemini-3.5-flash" })
  assert.equal(parseModelId("mistral:large"), null)
  assert.equal(parseModelId("openai:"), null)
  assert.equal(parseModelId(""), null)
})

// ─── Errors ───────────────────────────────────────────────────────────

check("classifyProviderError maps provider status codes", () => {
  assert.equal(classifyProviderError({ statusCode: 401, message: "Unauthorized" }), "PROVIDER_AUTH_FAILED")
  assert.equal(classifyProviderError({ statusCode: 403 }), "PROVIDER_AUTH_FAILED")
  assert.equal(
    classifyProviderError({ statusCode: 400, message: "API key not valid. Please pass a valid API key." }),
    "PROVIDER_AUTH_FAILED",
  )
  assert.equal(classifyProviderError({ statusCode: 429 }), "PROVIDER_RATE_LIMITED")
  assert.equal(classifyProviderError({ statusCode: 404 }), "PROVIDER_MODEL_NOT_FOUND")
  assert.equal(classifyProviderError({ statusCode: 503 }), "PROVIDER_UNAVAILABLE")
  assert.equal(classifyProviderError(new Error("something odd")), "PROVIDER_ERROR")
  assert.equal(classifyProviderError(undefined), "PROVIDER_ERROR")
})

check("classifyProviderError maps a provider 400 to a rejected request", () => {
  const invalid = { statusCode: 400, message: "Request contains an invalid argument." }
  assert.equal(classifyProviderError(invalid), "PROVIDER_REQUEST_REJECTED")
  assert.equal(chatErrorStatus("PROVIDER_REQUEST_REJECTED"), 502)
})

check("describeProviderError keeps status, url and body but redacts query keys", () => {
  const details = describeProviderError({
    name: "AI_RetryError",
    lastError: {
      name: "AI_APICallError",
      statusCode: 400,
      url: "https://generativelanguage.googleapis.com/v1beta/models/x:streamGenerateContent?alt=sse&key=secret123",
      responseBody: `{"error":{"message":"Request contains an invalid argument."}}${"x".repeat(3000)}`,
    },
  })
  assert.ok(details)
  assert.equal(details.statusCode, 400)
  assert.equal(details.name, "AI_APICallError")
  assert.ok(details.url && !details.url.includes("secret123"))
  assert.match(details.responseBody ?? "", /invalid argument/)
  assert.ok((details.responseBody ?? "").length <= 2003)
  assert.equal(describeProviderError(new Error("plain")), null)
})

check("classifyProviderError unwraps retry errors", () => {
  const retry = { name: "AI_RetryError", message: "Failed after 3 attempts", lastError: { statusCode: 429 } }
  assert.equal(classifyProviderError(retry), "PROVIDER_RATE_LIMITED")
})

check("chat errors round-trip through the wire format", () => {
  const error = new ChatError({ code: "NO_KEY_CONFIGURED", provider: "anthropic" })
  assert.equal(error.status, 412)
  assert.match(error.message, /Anthropic/)
  const parsed = parseChatError(serializeChatError(error.payload))
  assert.equal(parsed.code, "NO_KEY_CONFIGURED")
  assert.equal(parsed.provider, "anthropic")
  assert.equal(parsed.message, error.message)
})

check("parseChatError degrades gracefully on foreign text", () => {
  assert.equal(parseChatError("Failed to fetch").code, "INTERNAL")
  assert.equal(parseChatError(JSON.stringify({ error: { code: "NOPE" } })).code, "INTERNAL")
  assert.equal(parseChatError(undefined).code, "INTERNAL")
  assert.equal(chatErrorStatus("INSTANCE_LIMIT_REACHED"), 429)
})

check("chat error copy avoids dashes and middle dots", () => {
  for (const code of [
    "NO_KEY_CONFIGURED",
    "PROVIDER_AUTH_FAILED",
    "PROVIDER_RATE_LIMITED",
    "INSTANCE_LIMIT_REACHED",
  ] as const) {
    const message = new ChatError({ code, provider: "google", source: "lab", labName: "Puelles Lab" }).message
    assert.doesNotMatch(message, /[\u2014\u2013\u00b7]/)
  }
})

finish("chat unit")
