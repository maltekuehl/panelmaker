import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse, NotFoundError } from "@/lib/error-handling"
import { deleteUser, getUserProfile, updateProfileSchema, updateUserProfile } from "@/models/user"
import { NextRequest } from "next/server"

export const GET = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    const profile = await getUserProfile(user.id)
    if (!profile) throw new NotFoundError("User not found")
    return createSuccessResponse({ data: profile })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch profile")
  }
})

export const PATCH = createAuthHandler(async (request: NextRequest, user) => {
  try {
    const updated = await updateUserProfile(user.id, updateProfileSchema.parse(await request.json()))
    return createSuccessResponse({ success: true, data: updated })
  } catch (error) {
    return createErrorResponse(error, "Failed to update profile")
  }
})

export const DELETE = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    await deleteUser(user.id)
    return createSuccessResponse({ message: "Account deleted successfully" })
  } catch (error) {
    return createErrorResponse(error, "Failed to delete account")
  }
})
