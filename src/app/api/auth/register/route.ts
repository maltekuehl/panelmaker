import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { registerSchema, registerUser } from "@/models/user"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await registerUser(registerSchema.parse(await request.json()))
    return createSuccessResponse({ success: true, data: user }, 201)
  } catch (error) {
    return createErrorResponse(error, "Registration failed")
  }
}
