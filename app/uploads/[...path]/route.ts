import { resolveUploadPath } from "@/lib/storage"
import { readFile } from "node:fs/promises"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params

  if (!path || path.length !== 1) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const filePath = resolveUploadPath(path[0])
    const file = await readFile(filePath)
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
