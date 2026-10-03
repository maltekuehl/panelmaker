import "server-only"

import { verifyProviderKey, type KeyCheckResult } from "@/lib/ai/verify-key"
import { requireLabMember } from "@/lib/auth"
import { isEncryptionConfigured } from "@/lib/crypto"
import { ForbiddenError } from "@/lib/error-handling"
import type { ApiCredentialStatus, LabRole } from "@/lib/generated/prisma/enums"
import {
  chatErrorMessage,
  chatErrorStatus,
  PROVIDER_LABELS,
  setCredentialStatus,
  upsertCredentialSchema,
  type ChatErrorCode,
  type ProviderId,
  type StoredSecret,
} from "@/models/chat"
import { canDoLabAction } from "@/models/lab/access"
import { NextRequest, NextResponse } from "next/server"

export function credentialErrorResponse(code: ChatErrorCode, message?: string, provider?: ProviderId): NextResponse {
  return NextResponse.json(
    { error: message ?? chatErrorMessage({ code, provider }), code },
    { status: chatErrorStatus(code) },
  )
}

interface SaveInput {
  provider: ProviderId
  apiKey: string
  label?: string
  status: ApiCredentialStatus
}

// Shared POST body for user and lab keys: refuse without encryption, verify the key with a free
// provider call, reject keys the provider refuses, and store the rest with their verification state.
export async function saveCredentialFromRequest(
  request: NextRequest,
  save: (input: SaveInput) => Promise<void>,
): Promise<NextResponse> {
  if (!isEncryptionConfigured()) return credentialErrorResponse("ENCRYPTION_NOT_CONFIGURED")
  const body = await request.json().catch(() => null)
  const parsed = upsertCredentialSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid API key", code: "INVALID_REQUEST", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { provider, apiKey, label } = parsed.data
  const check = await verifyProviderKey(provider, apiKey)
  if (check === "INVALID") {
    return NextResponse.json(
      {
        error: `${PROVIDER_LABELS[provider]} rejected this key. Check that it is complete and still active.`,
        code: "PROVIDER_AUTH_FAILED",
      },
      { status: 400 },
    )
  }
  await save({ provider, apiKey, label, status: check === "VALID" ? "VALID" : "UNVERIFIED" })
  return NextResponse.json({ success: true, check }, { status: 201 })
}

export async function testStoredCredential(credentialId: string, secret: StoredSecret | null): Promise<NextResponse> {
  if (!secret) return NextResponse.json({ error: "API key not found" }, { status: 404 })
  if (!secret.key) {
    return credentialErrorResponse(
      isEncryptionConfigured() ? "KEY_UNREADABLE" : "ENCRYPTION_NOT_CONFIGURED",
      undefined,
      secret.provider,
    )
  }
  const check: KeyCheckResult = await verifyProviderKey(secret.provider, secret.key)
  if (check === "VALID" || check === "INVALID") await setCredentialStatus(credentialId, check)
  return NextResponse.json({ check })
}

export async function requireKeyManager(
  request: NextRequest,
  labId: string,
): Promise<{ user: { id: string }; role: LabRole }> {
  const membership = await requireLabMember(request, labId)
  if (!canDoLabAction(membership.role, "manage_api_keys")) throw new ForbiddenError("Insufficient lab role")
  return membership
}
