import { getSessionUser, resolveViewerContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveUploadPath } from "@/lib/storage"
import { canViewExperiment } from "@/models/lab"
import { readFile } from "node:fs/promises"
import { NextRequest, NextResponse } from "next/server"

const UPLOAD_FILENAME = /^[a-z0-9-]+\.webp$/i

const notFound = () => new NextResponse("Not found", { status: 404 })

async function canViewUpload(filename: string): Promise<{ allowed: boolean; isPublic: boolean }> {
  const images = await prisma.reportImage.findMany({
    where: { url: `/uploads/${filename}` },
    select: {
      report: {
        select: {
          experiment: {
            select: {
              submitterId: true,
              visibility: true,
              owningLabId: true,
              labShares: { select: { labId: true } },
            },
          },
        },
      },
    },
  })

  const experiments = images.map((image) => image.report.experiment)

  if (experiments.some((experiment) => experiment.visibility === "PUBLIC")) {
    return { allowed: true, isPublic: true }
  }

  const user = await getSessionUser()
  if (!user) {
    return { allowed: false, isPublic: false }
  }

  if (experiments.length === 0) {
    return { allowed: true, isPublic: false }
  }

  const viewer = await resolveViewerContext(user.id)
  return { allowed: experiments.some((experiment) => canViewExperiment(viewer, experiment)), isPublic: false }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params

  if (!path || path.length !== 1 || !UPLOAD_FILENAME.test(path[0])) {
    return notFound()
  }

  const { allowed, isPublic } = await canViewUpload(path[0])
  if (!allowed) {
    return notFound()
  }

  try {
    const filePath = resolveUploadPath(path[0])
    const file = await readFile(filePath)
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, max-age=0, must-revalidate",
      },
    })
  } catch {
    return notFound()
  }
}
