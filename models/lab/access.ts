// Pure access-control predicates. No prisma client and no "server-only" import so these can be
// unit-tested without a database. Only type-only imports of generated enums are allowed here.
import type { LabRole, Visibility } from "@/lib/generated/prisma/enums"

export interface ViewerContext {
  userId: string
  labIds: string[]
  roleByLab: Record<string, LabRole>
  isAdmin: boolean
}

export const ROLE_RANK: Record<LabRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

export function isLabMember(viewer: ViewerContext, labId: string): boolean {
  return Boolean(viewer.roleByLab[labId])
}

export function hasLabRole(viewer: ViewerContext, labId: string, min: LabRole): boolean {
  const role = viewer.roleByLab[labId]
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

// Lab-management capabilities, derived from the membership role.
export type LabAction =
  | "edit_lab"
  | "invite"
  | "change_role"
  | "remove_member"
  | "delete_lab"
  | "manage_inventory"
  | "create_resource"
  | "manage_shares"

export function canDoLabAction(role: LabRole | undefined, action: LabAction): boolean {
  if (!role) return false
  switch (action) {
    case "delete_lab":
      return role === "OWNER"
    case "edit_lab":
    case "invite":
    case "change_role":
    case "remove_member":
    case "manage_shares":
      return ROLE_RANK[role] >= ROLE_RANK.ADMIN
    case "manage_inventory":
    case "create_resource":
      return ROLE_RANK[role] >= ROLE_RANK.MEMBER
  }
}

// Normalized shape a resource (experiment or panel) exposes for visibility checks.
export interface ResourceVisibility {
  ownerId: string | null
  visibility: Visibility
  owningLabId: string | null
  sharedLabIds: string[]
}

export function canViewResource(viewer: ViewerContext | null, resource: ResourceVisibility): boolean {
  if (resource.visibility === "PUBLIC") return true
  if (!viewer) return false
  if (resource.ownerId && resource.ownerId === viewer.userId) return true
  if (resource.visibility === "LAB") {
    return resource.sharedLabIds.some((labId) => viewer.labIds.includes(labId))
  }
  return false
}

// A lab ADMIN/OWNER may edit any resource owned by or shared with their lab, not only the creator.
export function canEditResource(viewer: ViewerContext | null, resource: ResourceVisibility): boolean {
  if (!viewer) return false
  if (resource.ownerId && resource.ownerId === viewer.userId) return true
  const labs = new Set<string>(resource.sharedLabIds)
  if (resource.owningLabId) labs.add(resource.owningLabId)
  for (const labId of labs) {
    if (hasLabRole(viewer, labId, "ADMIN")) return true
  }
  return false
}

type ExperimentAccessShape = {
  submitterId: string | null
  visibility: Visibility
  owningLabId: string | null
  labShares: { labId: string }[]
}

type PanelAccessShape = {
  ownerId: string | null
  visibility: Visibility
  owningLabId: string | null
  labShares: { labId: string }[]
}

export function experimentResource(experiment: ExperimentAccessShape): ResourceVisibility {
  return {
    ownerId: experiment.submitterId,
    visibility: experiment.visibility,
    owningLabId: experiment.owningLabId,
    sharedLabIds: experiment.labShares.map((share) => share.labId),
  }
}

export function panelResource(panel: PanelAccessShape): ResourceVisibility {
  return {
    ownerId: panel.ownerId,
    visibility: panel.visibility,
    owningLabId: panel.owningLabId,
    sharedLabIds: panel.labShares.map((share) => share.labId),
  }
}

export function canViewExperiment(viewer: ViewerContext | null, experiment: ExperimentAccessShape): boolean {
  return canViewResource(viewer, experimentResource(experiment))
}

export function canEditExperiment(viewer: ViewerContext | null, experiment: ExperimentAccessShape): boolean {
  return canEditResource(viewer, experimentResource(experiment))
}

export function canViewPanel(viewer: ViewerContext | null, panel: PanelAccessShape): boolean {
  return canViewResource(viewer, panelResource(panel))
}

export function canEditPanel(viewer: ViewerContext | null, panel: PanelAccessShape): boolean {
  return canEditResource(viewer, panelResource(panel))
}
