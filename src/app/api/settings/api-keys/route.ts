import { saveCredentialFromRequest } from "@/lib/ai/credential-api"
import { requireAuth, resolveViewerContext } from "@/lib/auth"
import { isEncryptionConfigured } from "@/lib/crypto"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getKeyInventory, getUserApiCredentials, upsertUserApiCredential } from "@/models/chat"
import { NextRequest } from "next/server"

// GET /api/settings/api-keys - The current user's provider keys (masked) and the lab and instance
// keys they fall back to when they have none of their own
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const [credentials, inventory] = await Promise.all([
      getUserApiCredentials(user.id),
      resolveViewerContext(user.id).then(getKeyInventory),
    ])
    return createSuccessResponse({
      credentials,
      encryptionConfigured: isEncryptionConfigured(),
      fallbacks: { labs: inventory.labs, instance: inventory.instance },
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch API keys")
  }
}

// POST /api/settings/api-keys - Verify and save (or replace) a provider key for the current user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    return await saveCredentialFromRequest(request, (input) => upsertUserApiCredential(user.id, input))
  } catch (error) {
    return createErrorResponse(error, "Failed to save API key")
  }
}
