import { searchEfoImagingMethods } from "@/lib/ontology"
import type { PrismaClient } from "../src/lib/generated/prisma/client"

// Stores an EFO imaging method term, looked up in OLS by its CURIE, unless it is already there.
export async function storeEfoImagingMethod(prisma: PrismaClient, id: string): Promise<{ id: string; label: string }> {
  const existing = await prisma.imagingMethod.findUnique({ where: { id }, select: { id: true, label: true } })
  if (existing) return existing

  const match = (await searchEfoImagingMethods(id)).find((term) => term.id === id)
  if (!match) throw new Error(`Imaging method ${id} not found in the EFO spatial proteomics branch`)
  return prisma.imagingMethod.create({ data: { id: match.id, label: match.label }, select: { id: true, label: true } })
}

// A method EFO has no term for, stored as its own row under the closest EFO term.
export async function storeLocalImagingMethod(
  prisma: PrismaClient,
  label: string,
  parentId: string,
): Promise<{ id: string; label: string }> {
  await storeEfoImagingMethod(prisma, parentId)
  const existing = await prisma.imagingMethod.findFirst({
    where: { label, parentId },
    select: { id: true, label: true },
  })
  if (existing) return existing
  return prisma.imagingMethod.create({ data: { label, parentId }, select: { id: true, label: true } })
}
