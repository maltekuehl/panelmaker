import { getInstanceProviders } from "@/lib/ai/config"
import { requireKeyManager, saveCredentialFromRequest } from "@/lib/ai/credential-api"
import { isEncryptionConfigured } from "@/lib/crypto"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getLabApiCredentials, upsertLabApiCredential } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string }> }

// GET /api/labs/[id]/api-keys - The lab's shared provider keys (masked). ADMIN or OWNER only.
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    await requireKeyManager(request, id)
    const credentials = await getLabApiCredentials(id)
    return createSuccessResponse({
      credentials,
      encryptionConfigured: isEncryptionConfigured(),
      fallbacks: { labs: [], instance: getInstanceProviders() },
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch lab API keys")
  }
}

// POST /api/labs/[id]/api-keys - Verify and save (or replace) a shared provider key. ADMIN or OWNER only.
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { user } = await requireKeyManager(request, id)
    return await saveCredentialFromRequest(request, (input) => upsertLabApiCredential(id, user.id, input))
  } catch (error) {
    return createErrorResponse(error, "Failed to save lab API key")
  }
}
