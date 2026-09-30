import { auth } from "@/auth"
import { ApiException, createErrorResponse } from "@/lib/error-handling"
import { type LabRole, UserRole, UserStatus, Visibility } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { ROLE_RANK, type ViewerContext } from "@/models/lab/access"
import { getSoleOwnerLabIds, getUserLabMemberships, getUserLabRole } from "@/models/lab/queries"
import { normalizeEmail } from "@/models/user/transforms"
import { NextRequest, NextResponse } from "next/server"
import { cache } from "react"

export interface AuthenticatedUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin?: boolean
}

export const isUserAdmin = cache(async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === UserRole.ADMIN
})

// Loads the live user row behind a session token. Returns null when the account no longer exists
// or is blocked, so a still-valid JWT cannot outlive the account it points at.
async function loadSessionUser(userId: string): Promise<AuthenticatedUser | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true, status: true },
  })
  if (!row || row.status === UserStatus.BLOCKED) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    isAdmin: row.role === UserRole.ADMIN,
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const session = await auth()
  const user = session?.user?.id ? await loadSessionUser(session.user.id) : null

  if (!user) {
    await logSecurityEventFromRequest(request, SecurityEventType.AUTH_FAILURE, {
      userId: session?.user?.id,
      action: "access",
      success: false,
    })
    throw new Error("Authentication required")
  }

  return user
}

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request)

  if (!user.isAdmin) {
    // Log authorization failure
    await logSecurityEventFromRequest(request, SecurityEventType.AUTHZ_FAILURE, {
      userId: user.id,
      action: "admin_access",
      success: false,
      metadata: {
        requiredRole: "ADMIN",
        userRole: "USER",
      },
    })
    throw new Error("Admin access required")
  }

  return {
    ...user,
    isAdmin: true,
  }
}

export function createAuthHandler<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
  requireAdminAccess = false,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = requireAdminAccess ? await requireAdmin(request) : await requireAuth(request)

      return await handler(request, user, ...args)
    } catch (error) {
      const response = authErrorResponse(error)
      if (response) return response
      throw error
    }
  }
}

// Maps ApiException and the string errors thrown by the require* guards to an HTTP response.
// Returns null when the error is not a recognized auth error, so callers can fall through.
export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ApiException) return createErrorResponse(error)
  if (!(error instanceof Error)) return null
  switch (error.message) {
    case "Authentication required":
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    case "Admin access required":
    case "Lab membership required":
    case "Insufficient lab role":
      return NextResponse.json({ error: error.message }, { status: 403 })
    case "Resource not found":
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    default:
      return null
  }
}

// Session user for server components and pages. Returns null when there is no session, when the
// JWT names a user row that no longer exists (for example after a database reset), or when the
// account is blocked. Pages must use this rather than reading session.user.id straight from auth(),
// otherwise a stale cookie reaches Prisma and fails on a foreign key.
export const getSessionUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const account = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, role: true, status: true },
  })
  if (!account || account.status === UserStatus.BLOCKED) return null

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    image: account.image,
    isAdmin: account.role === UserRole.ADMIN,
  }
})

// Resolves the per-request lab context for a user (memberships, roles, site-admin flag).
// Memoized per request and intentionally NOT cached in the JWT, so a removed member or a role
// change takes effect immediately on the next request.
export const resolveViewerContext = cache(async (userId: string | null): Promise<ViewerContext | null> => {
  if (!userId) return null
  const [memberships, account] = await Promise.all([
    getUserLabMemberships(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, status: true } }),
  ])
  if (!account || account.status === UserStatus.BLOCKED) return null
  const roleByLab: Record<string, LabRole> = {}
  for (const membership of memberships) {
    roleByLab[membership.labId] = membership.role
  }
  return {
    userId,
    labIds: memberships.map((membership) => membership.labId),
    roleByLab,
    isAdmin: account.role === UserRole.ADMIN,
  }
})

// Requires an authenticated user who is a member of the given lab. Returns the user and their role.
export async function requireLabMember(
  request: NextRequest,
  labId: string,
): Promise<{ user: AuthenticatedUser; role: LabRole }> {
  const user = await requireAuth(request)
  const role = await getUserLabRole(user.id, labId)
  if (!role) {
    await logSecurityEventFromRequest(request, SecurityEventType.AUTHZ_FAILURE, {
      userId: user.id,
      action: "lab_access",
      success: false,
      metadata: { labId },
    })
    throw new Error("Lab membership required")
  }
  return { user, role }
}

// Requires an authenticated lab member whose role is at least `minRole`.
export async function requireLabRole(
  request: NextRequest,
  labId: string,
  minRole: LabRole,
): Promise<{ user: AuthenticatedUser; role: LabRole }> {
  const { user, role } = await requireLabMember(request, labId)
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    await logSecurityEventFromRequest(request, SecurityEventType.AUTHZ_FAILURE, {
      userId: user.id,
      action: "lab_role",
      success: false,
      metadata: { labId, requiredRole: minRole, role },
    })
    throw new Error("Insufficient lab role")
  }
  return { user, role }
}

// Helper function for optional auth (user might or might not be authenticated)
export async function getOptionalAuth(_request: NextRequest): Promise<AuthenticatedUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return loadSessionUser(session.user.id)
}

// Check if a user can sign in (not blocked)
export async function canSignIn(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { status: true },
  })

  // If user doesn't exist yet, they can sign in (will be created)
  if (!user) return true

  // Check if user is not blocked
  return user.status !== UserStatus.BLOCKED
}

// Block a user
export async function blockUser(userId: string): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!target) throw new ApiException(404, { message: "User not found", code: "USER_NOT_FOUND" })
  if (target.role === UserRole.ADMIN) {
    throw new ApiException(409, { message: "Admin accounts cannot be blocked", code: "ADMIN_USER" })
  }
  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.BLOCKED },
  })
}

// Unblock a user
export async function unblockUser(userId: string): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
  })
  if (count === 0) throw new ApiException(404, { message: "User not found", code: "USER_NOT_FOUND" })
}

// Delete a user and all their data
export async function deleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) {
    throw new ApiException(404, { message: "User not found", code: "USER_NOT_FOUND" })
  }

  if (user.role === UserRole.ADMIN) {
    throw new ApiException(403, { message: "Cannot delete admin users", code: "ADMIN_USER" })
  }

  const soleOwnerLabIds = await getSoleOwnerLabIds(userId)
  if (soleOwnerLabIds.length > 0) {
    throw new ApiException(409, {
      message: "Cannot delete a user who is the sole owner of a lab. Delete the lab first.",
      code: "SOLE_LAB_OWNER",
      details: { labIds: soleOwnerLabIds },
    })
  }

  // Panels and experiments keep the User relation with onDelete: SetNull so public contributions stay
  // in place. Private ones would become unreachable orphans, so they go with the account.
  await prisma.$transaction([
    prisma.panel.deleteMany({ where: { ownerId: userId, visibility: Visibility.PRIVATE, owningLabId: null } }),
    prisma.experiment.deleteMany({ where: { submitterId: userId, visibility: Visibility.PRIVATE, owningLabId: null } }),
    prisma.rateLimit.deleteMany({ where: { userId } }),
    prisma.chatMessage.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
}

// Get all users with pagination (admin only)
export async function getAllUsers(page: number = 1, pageSize: number = 20, search?: string) {
  const skip = (page - 1) * pageSize

  // Build where clause for search
  const whereClause = search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {}

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            panels: true,
            experiments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({
      where: whereClause,
    }),
  ])

  const totalPages = Math.ceil(totalUsers / pageSize)

  return {
    users,
    pagination: {
      page,
      pageSize,
      totalUsers,
      totalPages,
    },
  }
}
