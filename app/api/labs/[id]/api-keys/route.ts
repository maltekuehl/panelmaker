import { authErrorResponse, requireLabRole } from "@/lib/auth"
import { isEncryptionConfigured } from "@/lib/crypto"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getLabApiCredentials, upsertCredentialSchema, upsertLabApiCredential } from "@/models/chat"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type Context = { params: Promise<{ id: string }> }

// GET /api/labs/[id]/api-keys - List the lab's shared provider keys (masked). ADMIN or OWNER only.
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    await requireLabRole(request, id, "ADMIN")
    const credentials = await getLabApiCredentials(id)
    return createSuccessResponse({ credentials, encryptionConfigured: isEncryptionConfigured() })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch lab API keys")
  }
}

// POST /api/labs/[id]/api-keys - Save (or replace) a shared provider key for the lab. ADMIN or OWNER only.
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { user } = await requireLabRole(request, id, "ADMIN")
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: "Server encryption is not configured. Contact an administrator." },
        { status: 503 },
      )
    }
    const validated = upsertCredentialSchema.parse(await request.json())
    await upsertLabApiCredential(id, user.id, validated)
    return createSuccessResponse({ success: true }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to save lab API key")
  }
}
