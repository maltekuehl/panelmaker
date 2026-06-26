import { authErrorResponse, requireLabRole } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { deleteLabApiCredential } from "@/models/chat"
import { NextRequest } from "next/server"

type Context = { params: Promise<{ id: string; credentialId: string }> }

// DELETE /api/labs/[id]/api-keys/[credentialId] - Remove a shared lab key. ADMIN or OWNER only.
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id, credentialId } = await context.params
    await requireLabRole(request, id, "ADMIN")
    await deleteLabApiCredential(id, credentialId)
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete lab API key")
  }
}
