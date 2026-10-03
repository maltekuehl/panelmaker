import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { createLab, createLabSchema, getLabsForUser, toLabResponse } from "@/models/lab"
import { NextRequest } from "next/server"

// GET /api/labs - List the labs the current user belongs to
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const labs = await getLabsForUser(user.id)
    return createSuccessResponse({ labs: labs.map(({ lab, role }) => toLabResponse(lab, role)) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch labs")
  }
}

// POST /api/labs - Create a lab. Any signed-in user can; the creator becomes OWNER.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.LABS_CREATE)
    if (!rateLimitResult.allowed) return createRateLimitError(rateLimitResult)

    const validated = createLabSchema.parse(await request.json())

    const lab = await createLab(validated, user.id)

    return createSuccessResponse({ lab: toLabResponse(lab, "OWNER") }, 201)
  } catch (error) {
    return createErrorResponse(error, "Failed to create lab")
  }
}
