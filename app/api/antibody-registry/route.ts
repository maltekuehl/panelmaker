import { searchAntibodyRegistry } from "@/lib/integrations/antibody-registry"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "10", 10) || 10, 25)
  const results = await searchAntibodyRegistry(q, limit)

  return NextResponse.json({ results })
}
