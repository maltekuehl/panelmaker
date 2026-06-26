import { auth } from "@/auth"
import { env } from "@/lib/env"
import { AccessStatus, type LabRole, UserRole, UserStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { logSecurityEventFromRequest, SecurityEventType } from "@/lib/security-events"
import { ROLE_RANK, type ViewerContext } from "@/models/lab/access"
import { getSoleOwnerLabIds, getUserLabMemberships, getUserLabRole } from "@/models/lab/queries"
import { NextRequest, NextResponse } from "next/server"
import { cache } from "react"

export interface AuthenticatedUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin?: boolean
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === UserRole.ADMIN
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const session = await auth()

  if (!session?.user?.id) {
    await logSecurityEventFromRequest(request, SecurityEventType.AUTH_FAILURE, {
      action: "access",
      success: false,
    })
    throw new Error("Authentication required")
  }

  await ensureUserExists(session.user)

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  }
}

async function ensureUserExists(user: {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}) {
  const byId = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  })
  if (byId) return

  if (user.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })
    if (byEmail) {
      if (byEmail.id !== user.id) {
        await prisma.user.update({
          where: { email: user.email },
          data: { id: user.id },
        })
      }
      return
    }
  }

  await prisma.user.create({
    data: {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? `${user.id}@placeholder.local`,
      image: user.image ?? null,
    },
  })
}

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request)
  const adminStatus = await isUserAdmin(user.id)

  if (!adminStatus) {
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
      if (error instanceof Error) {
        if (error.message === "Authentication required") {
          return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }
        if (error.message === "Admin access required") {
          return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }
        if (error.message === "Lab membership required" || error.message === "Insufficient lab role") {
          return NextResponse.json({ error: error.message }, { status: 403 })
        }
        if (error.message === "Resource not found") {
          return NextResponse.json({ error: "Resource not found" }, { status: 404 })
        }
      }
      throw error
    }
  }
}

// Maps the auth/authorization errors thrown by the require* guards to an HTTP response.
// Returns null when the error is not a recognized auth error, so callers can fall through.
export function authErrorResponse(error: unknown): NextResponse | null {
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

// Resolves the per-request lab context for a user (memberships, roles, site-admin flag).
// Memoized per request and intentionally NOT cached in the JWT, so a removed member or a role
// change takes effect immediately on the next request.
export const resolveViewerContext = cache(async (userId: string | null): Promise<ViewerContext | null> => {
  if (!userId) return null
  const [memberships, admin] = await Promise.all([getUserLabMemberships(userId), isUserAdmin(userId)])
  const roleByLab: Record<string, LabRole> = {}
  for (const membership of memberships) {
    roleByLab[membership.labId] = membership.role
  }
  return {
    userId,
    labIds: memberships.map((membership) => membership.labId),
    roleByLab,
    isAdmin: admin,
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
export async function getOptionalAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth(request)
  } catch {
    return null
  }
}

// Check if a user can sign in (not blocked)
export async function canSignIn(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { status: true },
  })

  // If user doesn't exist yet, they can sign in (will be created)
  if (!user) return true

  // Check if user is not blocked
  return user.status !== UserStatus.BLOCKED
}

// Block a user
export async function blockUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId, role: { not: UserRole.ADMIN } },
    data: { status: UserStatus.BLOCKED },
  })
}

// Unblock a user
export async function unblockUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
  })
}

// Verified access is only enforced in production. Elsewhere everyone is treated as verified.
// A single VERIFIED status unlocks both report submission and lab creation.
const ACCESS_GATE_ENABLED = env.NODE_ENV === "production"

export interface AccessState {
  status: AccessStatus
  isAdmin: boolean
  gateEnabled: boolean
  verified: boolean
}

export async function getAccessState(userId: string): Promise<AccessState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, accessStatus: true },
  })

  const isAdmin = user?.role === UserRole.ADMIN
  const status = user?.accessStatus ?? AccessStatus.NONE
  const verified = !ACCESS_GATE_ENABLED || isAdmin || status === AccessStatus.VERIFIED

  return { status, isAdmin, gateEnabled: ACCESS_GATE_ENABLED, verified }
}

// Whether a user has verified access to extended features (report submission, lab creation)
export async function isVerified(userId: string): Promise<boolean> {
  if (!ACCESS_GATE_ENABLED) return true
  return (await getAccessState(userId)).verified
}

// Whether a user is allowed to create experimental reports
export async function canSubmit(userId: string): Promise<boolean> {
  return isVerified(userId)
}

// Whether a user is allowed to create labs
export async function canCreateLab(userId: string): Promise<boolean> {
  return isVerified(userId)
}

// User requests verified access (idempotent: only NONE → REQUESTED)
export async function requestAccess(userId: string): Promise<AccessStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessStatus: true },
  })

  if (!user) throw new Error("User not found")
  if (user.accessStatus !== AccessStatus.NONE) return user.accessStatus

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { accessStatus: AccessStatus.REQUESTED, accessRequestedAt: new Date() },
    select: { accessStatus: true },
  })
  return updated.accessStatus
}

// Admin grants verified access
export async function grantAccess(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { accessStatus: AccessStatus.VERIFIED, accessRequestedAt: null },
  })
}

// Admin revokes verified access
export async function revokeAccess(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { accessStatus: AccessStatus.NONE, accessRequestedAt: null },
  })
}

// Delete a user and all their data
export async function deleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role === UserRole.ADMIN) {
    throw new Error("Cannot delete admin users")
  }

  const soleOwnerLabIds = await getSoleOwnerLabIds(userId)
  if (soleOwnerLabIds.length > 0) {
    throw new Error("Cannot delete a user who is the sole owner of a lab. Transfer ownership or delete the lab first.")
  }

  await prisma.user.delete({
    where: {
      id: userId,
      role: {
        not: UserRole.ADMIN,
      },
    },
  })
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
            },
          },
          {
            email: {
              contains: search,
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
        accessStatus: true,
        accessRequestedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            reviews: true,
            panels: true,
            experiments: true,
            blogPosts: true,
          },
        },
      },
      orderBy: [{ accessRequestedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
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
