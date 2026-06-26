import { authErrorResponse, canCreateLab, requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createLab, createLabSchema, getLabsForUser, toLabResponse } from "@/models/lab"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// GET /api/labs - List the labs the current user belongs to
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const labs = await getLabsForUser(user.id)
    return createSuccessResponse({ labs: labs.map(({ lab, role }) => toLabResponse(lab, role)) })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch labs")
  }
}

// POST /api/labs - Create a lab (verified users or site admins only). Creator becomes OWNER.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    if (!(await canCreateLab(user.id))) {
      return NextResponse.json(
        {
          error: "Your account needs to be verified by an admin before you can create a lab.",
          code: "NOT_VERIFIED",
        },
        { status: 403 },
      )
    }

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.LABS_CREATE)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const body = await request.json()
    const validated = createLabSchema.parse(body)

    const lab = await createLab(validated, user.id)

    return createSuccessResponse({ lab: toLabResponse(lab, "OWNER") }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error, "Validation error")
    }
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to create lab")
  }
}
