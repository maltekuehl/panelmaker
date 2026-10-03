import { createAuthHandler } from "@/lib/auth"
import { logger } from "@/lib/monitoring"
import { prisma } from "@/lib/prisma"
import { connection, NextRequest, NextResponse } from "next/server"

export const GET = createAuthHandler(async (request: NextRequest, user) => {
  await connection()
  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        status: true,
        orcid: true,
        institution: true,
        institutionId: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: { provider: true, providerAccountId: true, type: true, createdAt: true, updatedAt: true },
        },
        experiments: {
          include: {
            reports: { include: { cellTypes: true, validations: true, issues: true } },
            images: { include: { channels: true, cellTypes: true } },
          },
        },
        panels: {
          include: {
            cycles: { include: { markers: true } },
          },
        },
        labMemberships: {
          select: { labId: true, role: true, joinedAt: true, lab: { select: { name: true, slug: true } } },
        },
        labInvitesSent: {
          select: { id: true, labId: true, email: true, role: true, status: true, expiresAt: true, createdAt: true },
        },
        labInvitesAccepted: {
          select: { id: true, labId: true, email: true, role: true, status: true, acceptedAt: true },
        },
        labAntibodiesAdded: {
          select: {
            id: true,
            labId: true,
            antibodyId: true,
            storageLocation: true,
            lotNumber: true,
            status: true,
            notes: true,
            addedAt: true,
          },
        },
        chatConversations: {
          select: {
            id: true,
            title: true,
            model: true,
            createdAt: true,
            updatedAt: true,
            messages: { select: { id: true, role: true, content: true, model: true, createdAt: true } },
          },
        },
        apiCredentials: {
          select: { provider: true, label: true, last4: true, scope: true, createdAt: true },
        },
      },
    })

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const {
      accounts,
      experiments,
      panels,
      labMemberships,
      labInvitesSent,
      labInvitesAccepted,
      labAntibodiesAdded,
      chatConversations,
      apiCredentials,
      ...profile
    } = userData

    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: "2.0",
      user: profile,
      accounts,
      experiments,
      panels,
      labMemberships,
      labInvitesSent,
      labInvitesAccepted,
      labAntibodiesAdded,
      chatConversations,
      apiCredentials,
    }

    return NextResponse.json(exportData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="user-data-export-${user.id}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    logger.error("Error exporting user data", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to export user data" }, { status: 500 })
  }
})
