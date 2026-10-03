import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

// Derive a deterministic 32-byte key from ENCRYPTION_KEY. Read from process.env directly (rather
// than lib/env) so the crypto layer stays free of the full env-validation graph and is unit-testable.
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY is not configured. Set a 32+ character secret to store API credentials.")
  }
  return createHash("sha256").update(secret).digest()
}

// Returns "iv:authTag:ciphertext", each segment base64-encoded.
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":")
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(":")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret")
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return plain.toString("utf8")
}

export function maskSecret(secret: string): string {
  return secret.slice(-4)
}

export function isEncryptionConfigured(): boolean {
  const secret = process.env.ENCRYPTION_KEY
  return Boolean(secret && secret.length >= 32)
}
