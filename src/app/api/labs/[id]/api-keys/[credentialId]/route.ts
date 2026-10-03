import { requireKeyManager } from "@/lib/ai/credential-api"
import { authErrorResponse } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { deleteLabApiCredential } from "@/models/chat"
import { NextRequest, NextResponse } from "next/server"

type Context = { params: Promise<{ id: string; credentialId: string }> }

// DELETE /api/labs/[id]/api-keys/[credentialId] - Remove a shared lab key. ADMIN or OWNER only.
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id, credentialId } = await context.params
    await requireKeyManager(request, id)
    if (!(await deleteLabApiCredential(id, credentialId))) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }
    return createSuccessResponse({ success: true })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to delete lab API key")
  }
}
