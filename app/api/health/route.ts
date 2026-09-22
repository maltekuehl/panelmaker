import { getHealthStatus, logger } from "@/lib/monitoring"
import { NextResponse } from "next/server"

async function currentStatus(): Promise<{ status: string; timestamp: string }> {
  const health = await getHealthStatus()
  return { status: health.status, timestamp: health.timestamp }
}

export async function GET() {
  try {
    const status = await currentStatus()
    return NextResponse.json(status, { status: status.status === "unhealthy" ? 503 : 200 })
  } catch (error) {
    logger.error("Health check failed", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ status: "unhealthy", timestamp: new Date().toISOString() }, { status: 503 })
  }
}

export async function HEAD() {
  try {
    const status = await currentStatus()
    return new NextResponse(null, { status: status.status === "unhealthy" ? 503 : 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
