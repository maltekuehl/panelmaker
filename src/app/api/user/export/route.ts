import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, NotFoundError } from "@/lib/error-handling"
import { getUserExport } from "@/models/user"
import { connection, NextRequest, NextResponse } from "next/server"

export const GET = createAuthHandler(async (request: NextRequest, user) => {
  await connection()
  try {
    const userData = await getUserExport(user.id)
    if (!userData) throw new NotFoundError("User not found")

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
    return createErrorResponse(error, "Failed to export user data")
  }
})
