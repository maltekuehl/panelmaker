import { auth } from "@/auth"
import { createErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/error-handling"
import { type LabRole, UserRole, UserStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { ROLE_RANK, type ViewerContext } from "@/models/lab/access"
import { getUserLabMemberships, getUserLabRole } from "@/models/lab/queries"
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
    throw new UnauthorizedError()
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
    throw new ForbiddenError("Admin access required")
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
      return createErrorResponse(error)
    }
  }
}

// Session user for server components and pages. Returns null when there is no session, when the
// JWT names a user row that no longer exists (for example after a database reset), or when the
// account is blocked. Pages must use this rather than reading session.user.id straight from auth(),
// otherwise a stale cookie reaches Prisma and fails on a foreign key.
export const getSessionUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth()
  return session?.user?.id ? loadSessionUser(session.user.id) : null
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

// The signed-in viewer's lab context, for routes that apply viewer-scoped visibility or edit rules.
export async function requireViewer(request: NextRequest): Promise<ViewerContext> {
  const user = await requireAuth(request)
  const viewer = await resolveViewerContext(user.id)
  if (!viewer) throw new UnauthorizedError()
  return viewer
}

export async function getOptionalViewer(request: NextRequest): Promise<ViewerContext | null> {
  const user = await getOptionalAuth(request)
  return resolveViewerContext(user?.id ?? null)
}

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
    throw new ForbiddenError("Lab membership required")
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
    throw new ForbiddenError("Insufficient lab role")
  }
  return { user, role }
}

// Helper function for optional auth (user might or might not be authenticated)
export async function getOptionalAuth(_request: NextRequest): Promise<AuthenticatedUser | null> {
  return getSessionUser()
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
