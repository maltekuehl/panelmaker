import { authErrorResponse, requireAuth, resolveViewerContext } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getImportableInventory } from "@/models/lab"
import { NextRequest } from "next/server"

// GET /api/labs/inventory/mine - Antibodies stocked across the signed-in user's labs, for importing
// into a submission row. Scoped to the viewer's own lab memberships (resolved server-side).
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const viewer = await resolveViewerContext(user.id)
    const q = new URL(request.url).searchParams.get("q") ?? undefined

    const rows = await getImportableInventory(viewer?.labIds ?? [], q)
    const items = rows.map((row) => ({
      id: row.id,
      labName: row.lab.name,
      rrid: row.antibody.rrid,
      name: row.antibody.name,
      vendorName: row.antibody.vendorName,
      catalogNumber: row.antibody.catalogNumber,
      cloneId: row.antibody.cloneId,
      targetName: row.antibody.targetName,
      targetProtein: row.antibody.targetProtein,
      hostTaxon: row.antibody.hostTaxon,
    }))

    return createSuccessResponse({ items })
  } catch (error) {
    return authErrorResponse(error) ?? createErrorResponse(error, "Failed to fetch lab inventory")
  }
}
