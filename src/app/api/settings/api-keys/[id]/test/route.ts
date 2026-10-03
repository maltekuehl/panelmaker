import { testStoredCredential } from "@/lib/ai/credential-api"
import { authErrorResponse, requireAuth } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { getUserCredentialSecret } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string }> }

// POST /api/settings/api-keys/[id]/test - Check a stored key against the provider and record the result
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const user = await requireAuth(request)
    return await testStoredCredential(id, await getUserCredentialSecret(user.id, id))
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to test API key")
  }
}
