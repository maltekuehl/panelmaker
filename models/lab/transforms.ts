import type { Clonality, LabAntibodyStatus, LabInvitationStatus, LabRole } from "@/lib/generated/prisma/enums"
import type { LabAntibodyRow, LabInvitationRow, LabMemberRow, LabRow } from "./queries"

export interface LabResponse {
  id: string
  name: string
  slug: string
  description: string | null
  institution: string | null
  institutionId: string | null
  avatarUrl: string | null
  website: string | null
  isPublicProfile: boolean
  createdById: string | null
  memberCount: number
  inventoryCount: number
  role?: LabRole
  createdAt: string
  updatedAt: string
}

export interface LabMemberResponse {
  id: string
  role: LabRole
  joinedAt: string
  invitedById: string | null
  user: {
    id: string
    name: string | null
    image: string | null
    institution: string | null
    orcid: string | null
  }
}

export function toLabResponse(lab: LabRow, role?: LabRole): LabResponse {
  return {
    id: lab.id,
    name: lab.name,
    slug: lab.slug,
    description: lab.description,
    institution: lab.institution,
    institutionId: lab.institutionId,
    avatarUrl: lab.avatarUrl,
    website: lab.website,
    isPublicProfile: lab.isPublicProfile,
    createdById: lab.createdById,
    memberCount: lab._count.memberships,
    inventoryCount: lab._count.inventory,
    role,
    createdAt: lab.createdAt.toISOString(),
    updatedAt: lab.updatedAt.toISOString(),
  }
}

export function toLabMemberResponse(member: LabMemberRow): LabMemberResponse {
  return {
    id: member.id,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
    invitedById: member.invitedById,
    user: member.user,
  }
}

export interface LabInvitationResponse {
  id: string
  labId: string
  email: string | null
  role: LabRole
  status: LabInvitationStatus
  maxUses: number | null
  useCount: number
  invitedById: string | null
  expiresAt: string
  createdAt: string
}

export function toLabInvitationResponse(invitation: LabInvitationRow): LabInvitationResponse {
  return {
    id: invitation.id,
    labId: invitation.labId,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    maxUses: invitation.maxUses,
    useCount: invitation.useCount,
    invitedById: invitation.invitedById,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  }
}

export interface LabAntibodyResponse {
  id: string
  status: LabAntibodyStatus
  storageLocation: string | null
  freezerLocation: string | null
  lotNumber: string | null
  vendorCatalog: string | null
  aliquotsRemaining: number | null
  notes: string | null
  lastValidatedAt: string | null
  addedAt: string
  addedBy: { id: string; name: string | null } | null
  antibody: {
    id: string
    rrid: string | null
    name: string
    clonality: Clonality | null
    vendorName: string | null
    targetName: string | null
    hostTaxon: { id: string; label: string } | null
    targetProtein: { id: string; label: string; geneSymbol: string | null } | null
  }
}

export function toLabAntibodyResponse(item: LabAntibodyRow): LabAntibodyResponse {
  return {
    id: item.id,
    status: item.status,
    storageLocation: item.storageLocation,
    freezerLocation: item.freezerLocation,
    lotNumber: item.lotNumber,
    vendorCatalog: item.vendorCatalog,
    aliquotsRemaining: item.aliquotsRemaining,
    notes: item.notes,
    lastValidatedAt: item.lastValidatedAt ? item.lastValidatedAt.toISOString() : null,
    addedAt: item.addedAt.toISOString(),
    addedBy: item.addedBy,
    antibody: {
      id: item.antibody.id,
      rrid: item.antibody.rrid,
      name: item.antibody.name,
      clonality: item.antibody.clonality,
      vendorName: item.antibody.vendorName,
      targetName: item.antibody.targetName,
      hostTaxon: item.antibody.hostTaxon,
      targetProtein: item.antibody.targetProtein,
    },
  }
}
