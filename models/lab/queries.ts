import "server-only"

import { DEFAULT_PAGE_SIZE, type LabInventoryParams } from "@/lib/data-table"
import type { Prisma } from "@/lib/generated/prisma/client"
import type {
  Clonality,
  LabAntibodyStatus,
  LabInvitationStatus,
  LabRole,
  Visibility,
} from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { type AntibodyRow, resolveAntibodyByRrid } from "@/models/antibody"
import { createHash, randomBytes } from "node:crypto"
import type { AddLabAntibodyData, CreateLabData, UpdateLabAntibodyData, UpdateLabData } from "./schema"

const labSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  institution: true,
  institutionId: true,
  avatarUrl: true,
  website: true,
  isPublicProfile: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { memberships: true, inventory: true } },
} satisfies Prisma.LabSelect

const labMemberSelect = {
  id: true,
  role: true,
  joinedAt: true,
  invitedById: true,
  user: { select: { id: true, name: true, image: true, institution: true, orcid: true } },
} satisfies Prisma.LabMembershipSelect

export type LabRow = Prisma.LabGetPayload<{ select: typeof labSelect }>
export type LabMemberRow = Prisma.LabMembershipGetPayload<{ select: typeof labMemberSelect }>
export type LabWithRole = { lab: LabRow; role: LabRole }

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return base || "lab"
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = base
  let suffix = 1
  while (await prisma.lab.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }
  return slug
}

export async function getLabById(id: string): Promise<LabRow | null> {
  return prisma.lab.findUnique({ where: { id }, select: labSelect })
}

export async function getLabBySlug(slug: string): Promise<LabRow | null> {
  return prisma.lab.findUnique({ where: { slug }, select: labSelect })
}

export async function getLabsForUser(userId: string): Promise<LabWithRole[]> {
  const memberships = await prisma.labMembership.findMany({
    where: { userId },
    select: { role: true, lab: { select: labSelect } },
    orderBy: { lab: { name: "asc" } },
  })
  return memberships.map((membership) => ({ lab: membership.lab, role: membership.role }))
}

export async function getUserLabMemberships(userId: string): Promise<{ labId: string; role: LabRole }[]> {
  return prisma.labMembership.findMany({
    where: { userId },
    select: { labId: true, role: true },
  })
}

export async function getUserLabRole(userId: string, labId: string): Promise<LabRole | null> {
  const membership = await prisma.labMembership.findUnique({
    where: { userId_labId: { userId, labId } },
    select: { role: true },
  })
  return membership?.role ?? null
}

export async function getLabMembers(labId: string): Promise<LabMemberRow[]> {
  return prisma.labMembership.findMany({
    where: { labId },
    select: labMemberSelect,
    orderBy: { joinedAt: "asc" },
  })
}

export async function countOwners(labId: string): Promise<number> {
  return prisma.labMembership.count({ where: { labId, role: "OWNER" } })
}

export async function createLab(data: CreateLabData, userId: string): Promise<LabRow> {
  const slug = await generateUniqueSlug(data.name)
  return prisma.lab.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      institution: data.institution || null,
      institutionId: data.institutionId || null,
      website: data.website ? data.website : null,
      isPublicProfile: data.isPublicProfile ?? false,
      createdById: userId,
      memberships: { create: { userId, role: "OWNER" } },
    },
    select: labSelect,
  })
}

export async function updateLab(id: string, data: UpdateLabData): Promise<LabRow> {
  return prisma.lab.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.institution !== undefined ? { institution: data.institution || null } : {}),
      ...(data.institutionId !== undefined ? { institutionId: data.institutionId || null } : {}),
      ...(data.website !== undefined ? { website: data.website ? data.website : null } : {}),
      ...(data.isPublicProfile !== undefined ? { isPublicProfile: data.isPublicProfile } : {}),
    },
    select: labSelect,
  })
}

export async function deleteLab(id: string): Promise<void> {
  await prisma.lab.delete({ where: { id } })
}

// Demoting the last OWNER is blocked so a lab can never be left ownerless.
export async function changeMemberRole(labId: string, targetUserId: string, role: LabRole): Promise<void> {
  const membership = await prisma.labMembership.findUnique({
    where: { userId_labId: { userId: targetUserId, labId } },
    select: { role: true },
  })
  if (!membership) throw new Error("Resource not found")
  if (membership.role === "OWNER" && role !== "OWNER" && (await countOwners(labId)) <= 1) {
    throw new Error("Cannot demote the last owner")
  }
  await prisma.labMembership.update({
    where: { userId_labId: { userId: targetUserId, labId } },
    data: { role },
  })
}

// Removing a member drops only the lab shares on resources that member personally owns and that are
// not owned by this lab, so the lab keeps its own data and the ex-member's private work stops being
// lab-visible. Removing the last OWNER is blocked.
export async function removeMember(labId: string, targetUserId: string): Promise<void> {
  const membership = await prisma.labMembership.findUnique({
    where: { userId_labId: { userId: targetUserId, labId } },
    select: { role: true },
  })
  if (!membership) throw new Error("Resource not found")
  if (membership.role === "OWNER" && (await countOwners(labId)) <= 1) {
    throw new Error("Cannot remove the last owner")
  }
  await prisma.$transaction([
    prisma.experimentLabShare.deleteMany({
      where: { labId, experiment: { submitterId: targetUserId, owningLabId: { not: labId } } },
    }),
    prisma.panelLabShare.deleteMany({
      where: { labId, panel: { ownerId: targetUserId, owningLabId: { not: labId } } },
    }),
    prisma.labMembership.delete({ where: { userId_labId: { userId: targetUserId, labId } } }),
  ])
}

// Labs of which a user is the sole OWNER. Used to block deleting such a user (which would orphan
// the lab via the LabMembership cascade).
export async function getSoleOwnerLabIds(userId: string): Promise<string[]> {
  const owned = await prisma.labMembership.findMany({
    where: { userId, role: "OWNER" },
    select: { labId: true },
  })
  const soleOwned: string[] = []
  for (const { labId } of owned) {
    if ((await countOwners(labId)) <= 1) soleOwned.push(labId)
  }
  return soleOwned
}

// ─── Resource visibility resolution ───────────────────────────────────

export type ResolvedVisibility = {
  visibility: Visibility
  owningLabId: string | null
  sharedLabIds: string[]
}

// Resolves a resource's visibility/attribution/share set from the owner's memberships. Never trusts
// client-supplied lab ids: every share and owning lab must be one the owner belongs to. Falls back to
// PRIVATE when a LAB resource has no lab to share with.
export async function resolveResourceVisibility(opts: {
  ownerId: string
  defaultVisibility: Visibility
  visibility?: Visibility
  sharedLabIds?: string[]
  owningLabId?: string | null
}): Promise<ResolvedVisibility> {
  const memberships = await prisma.labMembership.findMany({ where: { userId: opts.ownerId }, select: { labId: true } })
  const memberLabIds = new Set(memberships.map((m) => m.labId))

  let visibility: Visibility = opts.visibility ?? opts.defaultVisibility
  if (visibility === "LAB" && memberLabIds.size === 0) visibility = "PRIVATE"

  let owningLabId = opts.owningLabId ?? null
  if (owningLabId && !memberLabIds.has(owningLabId)) {
    throw new Error("You are not a member of the selected lab")
  }
  if (!owningLabId && memberLabIds.size === 1) owningLabId = [...memberLabIds][0]

  let sharedLabIds: string[] = []
  if (visibility === "LAB") {
    const requested = opts.sharedLabIds ?? [...memberLabIds]
    for (const labId of requested) {
      if (!memberLabIds.has(labId)) throw new Error("You can only share with labs you belong to")
    }
    const set = new Set(requested)
    if (owningLabId) set.add(owningLabId)
    sharedLabIds = [...set]
    if (sharedLabIds.length === 0) visibility = "PRIVATE"
  }

  return { visibility, owningLabId, sharedLabIds }
}

// ─── Invitations ──────────────────────────────────────────────────────

const labInvitationSelect = {
  id: true,
  labId: true,
  email: true,
  role: true,
  status: true,
  maxUses: true,
  useCount: true,
  invitedById: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  lab: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.LabInvitationSelect

export type LabInvitationRow = Prisma.LabInvitationGetPayload<{ select: typeof labInvitationSelect }>

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Only the SHA-256 hash of the token is stored; the raw token is returned once to the inviter.
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}

export interface CreateInvitationInput {
  labId: string
  email?: string | null
  role: LabRole
  maxUses?: number | null
  invitedById: string
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<{ invitation: LabInvitationRow; token: string }> {
  const email = input.email?.trim().toLowerCase() || null
  const isLink = email === null

  if (input.role === "OWNER") {
    throw new Error("Cannot invite a member as an owner")
  }
  if (isLink && input.role === "ADMIN") {
    throw new Error("Invite links cannot grant the admin role; send an admin invitation by email")
  }

  // Email invites default to single-use; reusable links default to unlimited.
  const maxUses = input.maxUses ?? (email ? 1 : null)
  if (input.role === "ADMIN" && (maxUses === null || maxUses < 1)) {
    throw new Error("Admin invitations must have a limited number of uses")
  }

  // Replace any prior pending invitation for the same lab and email.
  if (email) {
    await prisma.labInvitation.updateMany({
      where: { labId: input.labId, email, status: "PENDING" },
      data: { status: "REVOKED" },
    })
  }

  const token = randomBytes(32).toString("base64url")
  const invitation = await prisma.labInvitation.create({
    data: {
      labId: input.labId,
      email,
      role: input.role,
      tokenHash: hashToken(token),
      maxUses,
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    select: labInvitationSelect,
  })

  return { invitation, token }
}

export async function getInvitationByToken(rawToken: string): Promise<LabInvitationRow | null> {
  return prisma.labInvitation.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: labInvitationSelect,
  })
}

export interface InvitationView {
  status: LabInvitationStatus
  email: string | null
  role: LabRole
  expired: boolean
  labName: string
  labSlug: string
}

// Resolves an invitation for the join page. Computing `expired` here (a plain server module) keeps
// the impure time read out of the React Server Component render.
export async function getInvitationView(rawToken: string): Promise<InvitationView | null> {
  const invitation = await prisma.labInvitation.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: {
      status: true,
      email: true,
      role: true,
      expiresAt: true,
      lab: { select: { name: true, slug: true } },
    },
  })
  if (!invitation) return null
  return {
    status: invitation.status,
    email: invitation.email,
    role: invitation.role,
    expired: invitation.expiresAt.getTime() < Date.now(),
    labName: invitation.lab.name,
    labSlug: invitation.lab.slug,
  }
}

export async function listLabInvitations(labId: string): Promise<LabInvitationRow[]> {
  return prisma.labInvitation.findMany({
    where: { labId, status: "PENDING" },
    select: labInvitationSelect,
    orderBy: { createdAt: "desc" },
  })
}

export async function revokeInvitation(labId: string, invitationId: string): Promise<void> {
  const result = await prisma.labInvitation.updateMany({
    where: { id: invitationId, labId, status: "PENDING" },
    data: { status: "REVOKED" },
  })
  if (result.count === 0) throw new Error("Resource not found")
}

export async function sweepExpiredInvitations(): Promise<number> {
  const result = await prisma.labInvitation.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  })
  return result.count
}

export type AcceptInvitationResult = { labId: string; slug: string; labName: string; role: LabRole }

// Accepts an invitation transactionally. A conditional increment atomically claims a use so a
// single-use (or otherwise limited) token can never be redeemed beyond maxUses under concurrency.
export async function acceptInvitation(
  rawToken: string,
  userId: string,
  userEmail: string | null,
): Promise<AcceptInvitationResult> {
  const tokenHash = hashToken(rawToken)
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.labInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        labId: true,
        email: true,
        role: true,
        status: true,
        maxUses: true,
        useCount: true,
        invitedById: true,
        expiresAt: true,
        lab: { select: { slug: true, name: true } },
      },
    })
    if (!invitation) throw new Error("Invitation not found")
    if (invitation.status !== "PENDING") throw new Error("Invitation is no longer valid")
    if (invitation.expiresAt.getTime() < Date.now()) {
      await tx.labInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } })
      throw new Error("Invitation has expired")
    }
    if (invitation.email && userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address")
    }

    // Atomically claim a use. For limited invitations this prevents redeeming beyond maxUses.
    const claim = await tx.labInvitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        ...(invitation.maxUses !== null ? { useCount: { lt: invitation.maxUses } } : {}),
      },
      data: { useCount: { increment: 1 } },
    })
    if (claim.count === 0) throw new Error("Invitation is no longer valid")

    // Create the membership; keep any existing (possibly higher) role if already a member.
    await tx.labMembership.upsert({
      where: { userId_labId: { userId, labId: invitation.labId } },
      update: {},
      create: { userId, labId: invitation.labId, role: invitation.role, invitedById: invitation.invitedById },
    })

    // Mark limited invitations as accepted once their uses are exhausted.
    if (invitation.maxUses !== null) {
      await tx.labInvitation.updateMany({
        where: { id: invitation.id, useCount: { gte: invitation.maxUses } },
        data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: userId },
      })
    }

    return { labId: invitation.labId, slug: invitation.lab.slug, labName: invitation.lab.name, role: invitation.role }
  })
}

export async function declineInvitation(rawToken: string, userEmail: string | null): Promise<void> {
  const invitation = await prisma.labInvitation.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { id: true, email: true, status: true },
  })
  if (!invitation || invitation.status !== "PENDING") throw new Error("Invitation is no longer valid")
  if (!invitation.email) throw new Error("Open invite links cannot be declined")
  if (userEmail && invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address")
  }
  await prisma.labInvitation.update({ where: { id: invitation.id }, data: { status: "DECLINED" } })
}

// ─── Antibody inventory ────────────────────────────────────────────────

const labAntibodySelect = {
  id: true,
  labId: true,
  storageLocation: true,
  freezerLocation: true,
  lotNumber: true,
  vendorCatalog: true,
  aliquotsRemaining: true,
  status: true,
  notes: true,
  addedById: true,
  lastValidatedAt: true,
  addedAt: true,
  updatedAt: true,
  antibody: {
    select: {
      id: true,
      rrid: true,
      name: true,
      clonality: true,
      vendorName: true,
      targetName: true,
      hostTaxon: { select: { id: true, label: true } },
      targetProtein: { select: { id: true, label: true, geneSymbol: true } },
    },
  },
  addedBy: { select: { id: true, name: true } },
} satisfies Prisma.LabAntibodySelect

export type LabAntibodyRow = Prisma.LabAntibodyGetPayload<{ select: typeof labAntibodySelect }>

// Full inventory for a lab (unpaginated). Used by the lab-scoped AI query, which needs every item.
export async function getLabInventory(labId: string): Promise<LabAntibodyRow[]> {
  return prisma.labAntibody.findMany({
    where: { labId },
    select: labAntibodySelect,
    orderBy: { addedAt: "desc" },
  })
}

export interface LabInventoryPage {
  rows: LabAntibodyRow[]
  total: number
  page: number
  pageCount: number
}

export interface InventoryAcrossLabsFilter {
  markerIds?: string[]
  hostTaxonIds?: string[]
  clonalities?: string[]
  rrids?: string[]
  status?: string[]
}

// Inventory across several labs (used by the AI tools, which pass the viewer's own lab ids only).
export async function getInventoryForLabs(
  labIds: string[],
  filter: InventoryAcrossLabsFilter = {},
): Promise<LabAntibodyRow[]> {
  if (labIds.length === 0) return []
  const where: Prisma.LabAntibodyWhereInput = { labId: { in: labIds } }
  if (filter.status?.length) where.status = { in: filter.status as LabAntibodyStatus[] }

  const antibody: Prisma.AntibodyWhereInput = {}
  if (filter.markerIds?.length) antibody.targetProteinId = { in: filter.markerIds }
  if (filter.hostTaxonIds?.length) antibody.hostTaxonId = { in: filter.hostTaxonIds }
  if (filter.clonalities?.length) antibody.clonality = { in: filter.clonalities as Clonality[] }
  if (filter.rrids?.length) antibody.rrid = { in: filter.rrids }
  if (Object.keys(antibody).length) where.antibody = antibody

  return prisma.labAntibody.findMany({ where, select: labAntibodySelect, orderBy: { addedAt: "desc" }, take: 500 })
}

function buildInventoryWhere(labId: string, params: LabInventoryParams): Prisma.LabAntibodyWhereInput {
  const where: Prisma.LabAntibodyWhereInput = { labId }

  if (params.status.length > 0) {
    where.status = { in: params.status as LabAntibodyStatus[] }
  }

  const antibodyFilter: Prisma.AntibodyWhereInput = {}
  if (params.host.length > 0) antibodyFilter.hostTaxonId = { in: params.host }
  if (params.clonality.length > 0) antibodyFilter.clonality = { in: params.clonality as Clonality[] }
  if (Object.keys(antibodyFilter).length > 0) where.antibody = antibodyFilter

  const q = params.q.trim()
  if (q) {
    where.OR = [
      { antibody: { name: { contains: q, mode: "insensitive" } } },
      { antibody: { rrid: { contains: q, mode: "insensitive" } } },
      { antibody: { targetName: { contains: q, mode: "insensitive" } } },
      { antibody: { targetProtein: { geneSymbol: { contains: q, mode: "insensitive" } } } },
      { lotNumber: { contains: q, mode: "insensitive" } },
      { storageLocation: { contains: q, mode: "insensitive" } },
    ]
  }

  return where
}

function inventoryOrderBy(params: LabInventoryParams): Prisma.LabAntibodyOrderByWithRelationInput {
  const dir = params.order
  switch (params.sort) {
    case "antibody":
      return { antibody: { name: dir } }
    case "target":
      return { antibody: { targetName: dir } }
    case "host":
      return { antibody: { hostTaxon: { label: dir } } }
    case "clonality":
      return { antibody: { clonality: dir } }
    case "status":
      return { status: dir }
    case "aliquots":
      return { aliquotsRemaining: dir }
    case "added":
      return { addedAt: dir }
    default:
      return { addedAt: "desc" }
  }
}

// Paginated, searchable, sortable, filterable inventory for the lab inventory page.
export async function getLabInventoryPage(labId: string, params: LabInventoryParams): Promise<LabInventoryPage> {
  const where = buildInventoryWhere(labId, params)
  const pageSize = DEFAULT_PAGE_SIZE
  const page = Math.max(1, params.page)

  const [total, rows] = await Promise.all([
    prisma.labAntibody.count({ where }),
    prisma.labAntibody.findMany({
      where,
      select: labAntibodySelect,
      orderBy: inventoryOrderBy(params),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export interface InventoryFacetOption {
  value: string
  label: string
  description: string
}

export interface InventoryFacets {
  host: InventoryFacetOption[]
  clonality: InventoryFacetOption[]
}

const CLONALITY_LABELS: Record<Clonality, string> = {
  MONOCLONAL: "Monoclonal",
  POLYCLONAL: "Polyclonal",
  RECOMBINANT: "Recombinant",
  OLIGOCLONAL: "Oligoclonal",
}

const importableInventorySelect = {
  id: true,
  lab: { select: { name: true } },
  antibody: {
    select: {
      rrid: true,
      name: true,
      vendorName: true,
      catalogNumber: true,
      cloneId: true,
      targetName: true,
      targetProtein: { select: { id: true, label: true, geneSymbol: true } },
      hostTaxon: { select: { id: true, label: true } },
    },
  },
} satisfies Prisma.LabAntibodySelect

export type ImportableInventoryRow = Prisma.LabAntibodyGetPayload<{ select: typeof importableInventorySelect }>

// Inventory across all of a user's labs, shaped for importing into a submission antibody row. Caller
// is responsible for passing the viewer's own lab ids (never trust a client-supplied lab id here).
export async function getImportableInventory(labIds: string[], q?: string): Promise<ImportableInventoryRow[]> {
  if (labIds.length === 0) return []
  const where: Prisma.LabAntibodyWhereInput = { labId: { in: labIds } }
  const trimmed = q?.trim()
  if (trimmed) {
    where.OR = [
      { antibody: { name: { contains: trimmed, mode: "insensitive" } } },
      { antibody: { rrid: { contains: trimmed, mode: "insensitive" } } },
      { antibody: { targetName: { contains: trimmed, mode: "insensitive" } } },
      { antibody: { targetProtein: { geneSymbol: { contains: trimmed, mode: "insensitive" } } } },
    ]
  }
  return prisma.labAntibody.findMany({
    where,
    select: importableInventorySelect,
    orderBy: { antibody: { name: "asc" } },
    take: 25,
  })
}

// Distinct host species and clonalities present in a lab's inventory, with counts, for the filter
// dropdowns. The per-lab inventory is bounded so a single scan is fine.
export async function getLabInventoryFacets(labId: string): Promise<InventoryFacets> {
  const rows = await prisma.labAntibody.findMany({
    where: { labId },
    select: { antibody: { select: { clonality: true, hostTaxon: { select: { id: true, label: true } } } } },
  })

  const hostMap = new Map<string, { label: string; count: number }>()
  const clonalityMap = new Map<Clonality, number>()
  for (const row of rows) {
    const host = row.antibody.hostTaxon
    if (host) {
      const entry = hostMap.get(host.id) ?? { label: host.label, count: 0 }
      entry.count += 1
      hostMap.set(host.id, entry)
    }
    const clonality = row.antibody.clonality
    if (clonality) clonalityMap.set(clonality, (clonalityMap.get(clonality) ?? 0) + 1)
  }

  const host: InventoryFacetOption[] = [...hostMap.entries()]
    .map(([value, { label, count }]) => ({ value, label, description: String(count) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const clonality: InventoryFacetOption[] = [...clonalityMap.entries()]
    .map(([value, count]) => ({ value, label: CLONALITY_LABELS[value], description: String(count) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { host, clonality }
}

// Gap-fills antibody-identity facts the lab curates (host species, target protein, marker name) onto
// the shared global Antibody record. Only empty fields are filled, never overwritten, so one lab's
// curation cannot clobber data the registry or another lab already supplied. Filling the host species
// here is what makes "raised in" available for direct import into a later submission.
async function enrichAntibodyIdentity(antibody: AntibodyRow, data: AddLabAntibodyData): Promise<void> {
  const update: Prisma.AntibodyUpdateInput = {}

  if (data.hostSpecies && !antibody.hostTaxon) {
    await prisma.taxon.upsert({
      where: { id: data.hostSpecies.id },
      update: {},
      create: { id: data.hostSpecies.id, label: data.hostSpecies.label },
    })
    update.hostTaxon = { connect: { id: data.hostSpecies.id } }
  }

  if (data.proteinData && !antibody.targetProteinId) {
    await prisma.protein.upsert({
      where: { id: data.proteinData.id },
      update: {},
      create: {
        id: data.proteinData.id,
        label: data.proteinData.label,
        geneSymbol: data.proteinData.geneSymbol ?? null,
      },
    })
    update.targetProtein = { connect: { id: data.proteinData.id } }
  }

  const markerName = data.markerName?.trim()
  if (markerName && !antibody.targetName) {
    update.targetName = markerName
  }

  if (Object.keys(update).length > 0) {
    await prisma.antibody.update({ where: { id: antibody.id }, data: update })
  }
}

// Adds an antibody to a lab's inventory by RRID. The global Antibody is resolved first (created from
// the antibody registry if it is not already in the catalog, capturing all registry metadata), then
// any curated identity facts are gap-filled and the per-lab row is upserted so re-adding the same
// antibody refreshes its operational metadata rather than failing the unique key.
export async function upsertLabAntibody(
  labId: string,
  data: AddLabAntibodyData,
  addedById: string,
): Promise<LabAntibodyRow> {
  const antibody = await resolveAntibodyByRrid(data.rrid.trim())
  if (!antibody) {
    throw new Error("No antibody found for that RRID")
  }

  await enrichAntibodyIdentity(antibody, data)

  return prisma.labAntibody.upsert({
    where: { labId_antibodyId: { labId, antibodyId: antibody.id } },
    update: {
      storageLocation: data.storageLocation || null,
      freezerLocation: data.freezerLocation || null,
      lotNumber: data.lotNumber || null,
      vendorCatalog: data.vendorCatalog || null,
      aliquotsRemaining: data.aliquotsRemaining ?? null,
      status: data.status ?? "IN_STOCK",
      notes: data.notes || null,
    },
    create: {
      labId,
      antibodyId: antibody.id,
      storageLocation: data.storageLocation || null,
      freezerLocation: data.freezerLocation || null,
      lotNumber: data.lotNumber || null,
      vendorCatalog: data.vendorCatalog || null,
      aliquotsRemaining: data.aliquotsRemaining ?? null,
      status: data.status ?? "IN_STOCK",
      notes: data.notes || null,
      addedById,
    },
    select: labAntibodySelect,
  })
}

// Updates per-lab operational metadata. Scoped by labId so an item id from another lab cannot be
// patched (no cross-lab IDOR). Only the fields present in the payload are touched.
export async function updateLabAntibody(
  labId: string,
  itemId: string,
  data: UpdateLabAntibodyData,
): Promise<LabAntibodyRow> {
  const result = await prisma.labAntibody.updateMany({
    where: { id: itemId, labId },
    data: {
      ...(data.storageLocation !== undefined ? { storageLocation: data.storageLocation || null } : {}),
      ...(data.freezerLocation !== undefined ? { freezerLocation: data.freezerLocation || null } : {}),
      ...(data.lotNumber !== undefined ? { lotNumber: data.lotNumber || null } : {}),
      ...(data.vendorCatalog !== undefined ? { vendorCatalog: data.vendorCatalog || null } : {}),
      ...(data.aliquotsRemaining !== undefined ? { aliquotsRemaining: data.aliquotsRemaining } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    },
  })
  if (result.count === 0) throw new Error("Resource not found")
  const item = await prisma.labAntibody.findUnique({ where: { id: itemId }, select: labAntibodySelect })
  if (!item) throw new Error("Resource not found")
  return item
}

export async function removeLabAntibody(labId: string, itemId: string): Promise<void> {
  const result = await prisma.labAntibody.deleteMany({ where: { id: itemId, labId } })
  if (result.count === 0) throw new Error("Resource not found")
}
