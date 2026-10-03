import { requireAuth } from "@/lib/auth"
import { ApiException, BadRequestError, createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, saveUploadedImage } from "@/lib/storage"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.UPLOADS)
    if (!rateLimitResult.allowed) return createRateLimitError(rateLimitResult)

    const file = (await request.formData()).get("file")
    if (!(file instanceof File)) throw new BadRequestError("No file provided")
    if (file.size > MAX_UPLOAD_BYTES) throw new ApiException(413, { message: "File is too large" })
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new ApiException(415, { message: "Unsupported file type. Use PNG, JPG, WebP, or TIFF." })
    }

    const byteLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.UPLOAD_BYTES, Math.ceil(file.size / 1048576))
    if (!byteLimitResult.allowed) return createRateLimitError(byteLimitResult)

    const { url } = await saveUploadedImage(Buffer.from(await file.arrayBuffer()))
    return createSuccessResponse({ url }, 201)
  } catch (error) {
    return createErrorResponse(error, "Failed to upload image")
  }
}
