// Standalone assertions for the chat persistence helpers: encryption round-trip and message transforms.
// Run with: npx tsx tests/unit/chat.ts
// lib/crypto imports "server-only" (resolved by Next, not Node), so we stub it before importing crypto.
import type { UIMessage } from "ai"
import assert from "node:assert/strict"
import Module, { createRequire } from "node:module"
import { deriveRole, storedMessageId } from "../../models/chat/transforms"

const moduleLoader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown }
const originalLoad = moduleLoader._load
moduleLoader._load = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return {}
  return originalLoad.call(this, request, ...rest)
}

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "unit-test-encryption-key-0123456789abcdef"

const localRequire = createRequire(__filename)
const { decryptSecret, encryptSecret, isEncryptionConfigured, maskSecret } = localRequire(
  "../../lib/crypto",
) as typeof import("../../lib/crypto")

let failures = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

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

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`)
  process.exit(1)
}
console.log("\nAll chat unit assertions passed")
