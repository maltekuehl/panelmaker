import { requireAuth } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { checkUserRateLimit, createRateLimitError, RATE_LIMITS } from "@/lib/rate-limiting"
import {
  ALLOWED_MIME_TYPES,
  ImageTooLargeError,
  ImageTooSmallError,
  InvalidImageError,
  MAX_UPLOAD_BYTES,
  saveUploadedImage,
} from "@/lib/storage"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const rateLimitResult = await checkUserRateLimit(user.id, RATE_LIMITS.UPLOADS)
    if (!rateLimitResult.allowed) {
      return createRateLimitError(rateLimitResult) as NextResponse
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large" }, { status: 413 })
    }
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: "Unsupported file type. Use PNG, JPG, WebP, or TIFF." }, { status: 415 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await saveUploadedImage(buffer)

    return createSuccessResponse({ url }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (
      error instanceof ImageTooLargeError ||
      error instanceof ImageTooSmallError ||
      error instanceof InvalidImageError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    return createErrorResponse(error, "Failed to upload image")
  }
}
