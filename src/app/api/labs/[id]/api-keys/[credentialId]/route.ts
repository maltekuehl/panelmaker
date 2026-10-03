import { requireKeyManager } from "@/lib/ai/credential-api"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { deleteLabApiCredential } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string; credentialId: string }> }

// DELETE /api/labs/[id]/api-keys/[credentialId] - Remove a shared lab key. ADMIN or OWNER only.
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id, credentialId } = await context.params
    await requireKeyManager(request, id)
    await deleteLabApiCredential(id, credentialId)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return createErrorResponse(error, "Failed to delete lab API key")
  }
}
