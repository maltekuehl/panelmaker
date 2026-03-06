import { createAuthHandler, deleteUser } from "@/lib/auth"
import { logger } from "@/lib/monitoring"
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
    logger.error("Error fetching profile", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
})

const updateProfileSchema = z
  .object({
    name: z.string().max(100).nullable().optional(),
    orcid: z
      .string()
      .transform((val) => {
        const stripped = val.replace(/^https?:\/\/orcid\.org\//, "")
        const digits = stripped.replace(/-/g, "")
        if (/^\d{15}[\dX]$/.test(digits)) {
          return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`
        }
        return stripped
      })
      .pipe(z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Invalid ORCID format (expected 0000-0000-0000-0000)"))
      .nullable()
      .optional(),
    institution: z.string().max(255).nullable().optional(),
    institutionId: z.string().max(255).nullable().optional(),
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
    logger.error("Error updating profile", error instanceof Error ? error : new Error(String(error)))
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
    logger.error("Error deleting account", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
})
