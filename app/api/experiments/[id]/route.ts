import { requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getExperimentAccessById, updateExperiment, updateExperimentSchema } from "@/models/experiment"
import { canEditExperiment } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Invalid experiment ID" }, { status: 400 })
    }

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
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return createErrorResponse(error, "Failed to update experiment")
  }
}
