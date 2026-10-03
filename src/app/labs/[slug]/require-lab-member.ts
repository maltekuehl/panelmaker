import "server-only"

import { getSessionUser } from "@/lib/auth"
import type { LabRole } from "@/lib/generated/prisma/enums"
import { signInUrl } from "@/lib/routes"
import { getLabBySlug, getUserLabRole, ROLE_RANK, type LabRow } from "@/models/lab"
import { notFound, redirect } from "next/navigation"

export async function requireLabMember(
  slug: string,
  callbackPath: string,
  minRole: LabRole = "VIEWER",
): Promise<{ lab: LabRow; userId: string; role: LabRole }> {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl(callbackPath))
  }

  const lab = await getLabBySlug(slug)

  if (!lab) {
    notFound()
  }

  const role = await getUserLabRole(user.id, lab.id)

  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    notFound()
  }

  return { lab, userId: user.id, role }
}
