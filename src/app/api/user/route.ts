import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse } from "@/lib/error-handling"
import { getAllUsers } from "@/models/user"
import { connection, NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const userSearchSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200, "Search query too long").trim().optional(),
})

// GET /api/user - List all users with pagination (admin only)
export const GET = createAuthHandler(
  async (request: NextRequest) => {
    await connection()
    try {
      const params = userSearchSchema.parse(Object.fromEntries(request.nextUrl.searchParams))

      const result = await getAllUsers(params.page, params.pageSize, params.search || undefined)
      return NextResponse.json(result)
    } catch (error) {
      return createErrorResponse(error, "Failed to fetch users")
    }
  },
  true, // Require admin access
)
