// Single source of truth for the Prisma visibility WHERE filters used by the private (viewer-scoped)
// query lane. Type-only Prisma import so this stays unit-testable without a database.
//
// viewer === null collapses to PUBLIC-only. A truthy-but-empty viewer object is rejected so a coding
// slip fails closed rather than widening access.
import type { Prisma } from "@/lib/generated/prisma/client"
import type { ViewerContext } from "./access"

function assertViewer(viewer: ViewerContext | null): void {
  if (viewer === null) return
  if (typeof viewer.userId !== "string" || viewer.userId.length === 0 || !Array.isArray(viewer.labIds)) {
    throw new Error("Invalid viewer context: refusing to build a visibility filter that could widen access")
  }
}

export function buildReportVisibilityWhere(viewer: ViewerContext | null): Prisma.ExperimentalReportWhereInput {
  assertViewer(viewer)
  const or: Prisma.ExperimentalReportWhereInput[] = [{ status: "PUBLISHED", experiment: { visibility: "PUBLIC" } }]
  if (viewer?.userId) {
    or.push({ experiment: { submitterId: viewer.userId } })
  }
  if (viewer?.labIds.length) {
    or.push({ experiment: { visibility: "LAB", labShares: { some: { labId: { in: viewer.labIds } } } } })
  }
  return { OR: or }
}

export function buildExperimentVisibilityWhere(viewer: ViewerContext | null): Prisma.ExperimentWhereInput {
  assertViewer(viewer)
  const or: Prisma.ExperimentWhereInput[] = [{ visibility: "PUBLIC" }]
  if (viewer?.userId) {
    or.push({ submitterId: viewer.userId })
  }
  if (viewer?.labIds.length) {
    or.push({ visibility: "LAB", labShares: { some: { labId: { in: viewer.labIds } } } })
  }
  return { OR: or }
}

export function buildPanelVisibilityWhere(viewer: ViewerContext | null): Prisma.PanelWhereInput {
  assertViewer(viewer)
  const or: Prisma.PanelWhereInput[] = [{ visibility: "PUBLIC" }]
  if (viewer?.userId) {
    or.push({ ownerId: viewer.userId })
  }
  if (viewer?.labIds.length) {
    or.push({ visibility: "LAB", labShares: { some: { labId: { in: viewer.labIds } } } })
  }
  return { OR: or }
}
