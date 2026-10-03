import { requireKeyManager, testStoredCredential } from "@/lib/ai/credential-api"
import { authErrorResponse } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { getLabCredentialSecret } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string; credentialId: string }> }

// POST /api/labs/[id]/api-keys/[credentialId]/test - Check a shared lab key against the provider. ADMIN or OWNER only.
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id, credentialId } = await context.params
    await requireKeyManager(request, id)
    return await testStoredCredential(credentialId, await getLabCredentialSecret(id, credentialId))
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to test lab API key")
  }
}
