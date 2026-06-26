import { authErrorResponse, requireAuth } from "@/lib/auth"
import { isEncryptionConfigured } from "@/lib/crypto"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getUserApiCredentials, upsertCredentialSchema, upsertUserApiCredential } from "@/models/chat"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// GET /api/settings/api-keys - List the current user's saved provider keys (masked)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const credentials = await getUserApiCredentials(user.id)
    return createSuccessResponse({ credentials, encryptionConfigured: isEncryptionConfigured() })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch API keys")
  }
}

// POST /api/settings/api-keys - Save (or replace) a provider key for the current user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: "Server encryption is not configured. Contact an administrator." },
        { status: 503 },
      )
    }
    const validated = upsertCredentialSchema.parse(await request.json())
    await upsertUserApiCredential(user.id, validated)
    return createSuccessResponse({ success: true }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to save API key")
  }
}
