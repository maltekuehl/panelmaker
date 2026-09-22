import { JoinInvitation } from "@/components/lab/join-invitation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { getInvitationView } from "@/models/lab"
import { normalizeEmail } from "@/models/user/transforms"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Join a lab | PanelMaker",
  robots: { index: false, follow: false },
}

function Shell({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="container mx-auto flex justify-center px-4 py-12">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
    </div>
  )
}

export default async function JoinLabPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl(`/lab/join/${token}`))
  }

  const invitation = await getInvitationView(token)

  if (!invitation) {
    return (
      <Shell title="Invitation not found" description="This invite link is invalid. Ask the lab to send a new one." />
    )
  }

  if (invitation.status !== "PENDING") {
    return (
      <Shell
        title="Invitation unavailable"
        description="This invitation has already been used, declined, or revoked. Ask the lab for a new invite link."
      />
    )
  }

  if (invitation.expired) {
    return (
      <Shell title="Invitation expired" description="This invite link has expired. Ask the lab to send a new one." />
    )
  }

  const emailMismatch =
    invitation.email != null && user.email != null && invitation.email !== normalizeEmail(user.email)

  if (emailMismatch) {
    return (
      <Shell
        title="Wrong account"
        description={`This invitation was sent to ${invitation.email}. Sign in with that email address to accept it.`}
      />
    )
  }

  const roleLabel = invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()

  return (
    <Shell
      title={`Join ${invitation.labName}`}
      description={`You have been invited to join ${invitation.labName} as a ${roleLabel}.`}
    >
      <JoinInvitation token={token} canDecline={invitation.email != null} />
    </Shell>
  )
}
