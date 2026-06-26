import { LabAntibodyStatus, LabRole } from "@/lib/generated/prisma/enums"
import { z } from "zod"

export const createLabSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).optional(),
    institution: z.string().trim().max(200).optional(),
    institutionId: z.string().trim().max(100).optional(),
    website: z.string().trim().url().max(300).optional().or(z.literal("")),
    isPublicProfile: z.boolean().optional(),
  })
  .strict()

export const updateLabSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    institution: z.string().trim().max(200).nullable().optional(),
    institutionId: z.string().trim().max(100).nullable().optional(),
    website: z.string().trim().url().max(300).nullable().optional().or(z.literal("")),
    isPublicProfile: z.boolean().optional(),
  })
  .strict()

// Ownership transfer is intentionally not a role change; OWNER is excluded here.
export const changeMemberRoleSchema = z
  .object({
    role: z.enum([LabRole.ADMIN, LabRole.MEMBER, LabRole.VIEWER]),
  })
  .strict()

// Invitable roles exclude OWNER. An empty/absent email creates a reusable invite link.
export const inviteToLabSchema = z
  .object({
    email: z.string().trim().email().max(200).optional().or(z.literal("")),
    role: z.enum([LabRole.ADMIN, LabRole.MEMBER, LabRole.VIEWER]).default(LabRole.MEMBER),
    maxUses: z.number().int().positive().max(1000).nullable().optional(),
  })
  .strict()

export const acceptInvitationSchema = z.object({ token: z.string().min(1) }).strict()

const labAntibodyStatusSchema = z.enum([
  LabAntibodyStatus.IN_STOCK,
  LabAntibodyStatus.LOW,
  LabAntibodyStatus.ORDERED,
  LabAntibodyStatus.OUT_OF_STOCK,
])

const ontologyRefSchema = z.object({ id: z.string().min(1).max(200), label: z.string().min(1).max(300) })
const proteinRefSchema = ontologyRefSchema.extend({ geneSymbol: z.string().max(100).nullable().optional() })

// The antibody itself is resolved server-side from its RRID (all registry metadata is captured then,
// created from the registry if unknown). The optional identity fields let a member curate the global
// antibody record - notably the host species it was "raised in" - so the data is available for direct
// import into a later submission. Per-lab operational metadata (stock, storage, lot) is separate.
export const addLabAntibodySchema = z
  .object({
    rrid: z.string().trim().min(1).max(100),
    markerName: z.string().trim().max(200).optional(),
    proteinData: proteinRefSchema.nullable().optional(),
    hostSpecies: ontologyRefSchema.nullable().optional(),
    storageLocation: z.string().trim().max(200).optional(),
    freezerLocation: z.string().trim().max(200).optional(),
    lotNumber: z.string().trim().max(100).optional(),
    vendorCatalog: z.string().trim().max(100).optional(),
    aliquotsRemaining: z.number().int().min(0).max(1_000_000).nullable().optional(),
    status: labAntibodyStatusSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()

export const updateLabAntibodySchema = z
  .object({
    storageLocation: z.string().trim().max(200).nullable().optional(),
    freezerLocation: z.string().trim().max(200).nullable().optional(),
    lotNumber: z.string().trim().max(100).nullable().optional(),
    vendorCatalog: z.string().trim().max(100).nullable().optional(),
    aliquotsRemaining: z.number().int().min(0).max(1_000_000).nullable().optional(),
    status: labAntibodyStatusSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

export type CreateLabData = z.infer<typeof createLabSchema>
export type UpdateLabData = z.infer<typeof updateLabSchema>
export type ChangeMemberRoleData = z.infer<typeof changeMemberRoleSchema>
export type InviteToLabData = z.infer<typeof inviteToLabSchema>
export type AcceptInvitationData = z.infer<typeof acceptInvitationSchema>
export type AddLabAntibodyData = z.infer<typeof addLabAntibodySchema>
export type UpdateLabAntibodyData = z.infer<typeof updateLabAntibodySchema>
