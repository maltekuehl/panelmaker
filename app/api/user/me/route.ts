import { createAuthHandler, deleteUser } from "@/lib/auth"
import { getUserProfile, updateUserProfile } from "@/models/user"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const GET = createAuthHandler(async (_request: NextRequest, user) => {
  try {
    const profile = await getUserProfile(user.id)
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
})

const updateProfileSchema = z
  .object({
    orcid: z
      .string()
      .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Invalid ORCID format (expected 0000-0000-0000-0000)")
      .nullable()
      .optional(),
    institution: z.string().max(255).nullable().optional(),
  })
  .strict()

export const PATCH = createAuthHandler(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const validated = updateProfileSchema.parse(body)

    const updated = await updateUserProfile(user.id, validated)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
})

export const DELETE = createAuthHandler(async (request: NextRequest, user) => {
  try {
    if (!user.id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await deleteUser(user.id)
    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
})
