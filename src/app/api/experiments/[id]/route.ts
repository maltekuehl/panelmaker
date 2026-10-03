import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getExperimentAccessById, updateExperiment, updateExperimentSchema } from "@/models/experiment"
import { canEditExperiment } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const user = await requireAuth(request)
    const experiment = await getExperimentAccessById(id)

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    const viewer = await resolveViewerContext(user.id)
    if (!canEditExperiment(viewer, experiment)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateExperimentSchema.parse(body)

    const updated = await updateExperiment(id, validated)

    return createSuccessResponse({ experiment: updated })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to update experiment")
  }
}
