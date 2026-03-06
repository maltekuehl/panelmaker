import { logger } from "@/lib/monitoring"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

function stripOrcidPrefix(value: string): string {
  return value.replace(/^https?:\/\/orcid\.org\//, "")
}

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  orcid: z
    .string()
    .transform(stripOrcidPrefix)
    .pipe(z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Invalid ORCID format (e.g. 0000-0002-1825-0097)"))
    .optional()
    .or(z.literal("")),
  institution: z.string().max(200).optional().or(z.literal("")),
  institutionId: z.string().max(100).optional().or(z.literal("")),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    if (validated.orcid) {
      const existingOrcid = await prisma.user.findUnique({
        where: { orcid: validated.orcid },
        select: { id: true },
      })

      if (existingOrcid) {
        return NextResponse.json({ error: "An account with this ORCID already exists" }, { status: 409 })
      }
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12)

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        orcid: validated.orcid || null,
        institution: validated.institution || null,
        institutionId: validated.institutionId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    logger.error("Registration error", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
