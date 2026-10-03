import { requireViewer } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { requireEditableExperiment, updateExperiment, updateExperimentSchema } from "@/models/experiment"
import { NextRequest } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireEditableExperiment(id, await requireViewer(request))

    const updated = await updateExperiment(id, updateExperimentSchema.parse(await request.json()))
    return createSuccessResponse({ experiment: updated })
  } catch (error) {
    return createErrorResponse(error, "Failed to update experiment")
  }
}
