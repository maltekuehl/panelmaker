import { auth } from "@/auth"
import { InviteMemberForm } from "@/components/lab/invite-member-form"
import { LabPageHeader } from "@/components/lab/lab-page-header"
import { MemberManager } from "@/components/lab/member-manager"
import {
  getLabBySlug,
  getLabMembers,
  getUserLabRole,
  listLabInvitations,
  toLabInvitationResponse,
  toLabMemberResponse,
} from "@/models/lab"
import { Users } from "lucide-react"
import { notFound } from "next/navigation"

interface MembersPageProps {
  params: Promise<{ slug: string }>
}

export default async function LabMembersPage({ params }: MembersPageProps) {
  const { slug } = await params

  const [lab, session] = await Promise.all([getLabBySlug(slug), auth()])

  if (!lab) {
    notFound()
  }

  if (!session?.user?.id) {
    notFound()
  }

  const role = await getUserLabRole(session.user.id, lab.id)

  if (!role) {
    notFound()
  }

  const isAdminOrOwner = role === "ADMIN" || role === "OWNER"

  const [members, invitations] = await Promise.all([
    getLabMembers(lab.id),
    isAdminOrOwner ? listLabInvitations(lab.id) : Promise.resolve([]),
  ])

  const memberResponses = members.map(toLabMemberResponse)
  const invitationResponses = invitations.map(toLabInvitationResponse)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <LabPageHeader lab={lab} role={role} crumb="Members" />

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              Members
              <span className="ml-2 text-sm font-normal text-muted-foreground">({memberResponses.length})</span>
            </h2>
          </div>
          <MemberManager
            labId={lab.id}
            currentUserId={session.user.id}
            viewerRole={role}
            members={memberResponses}
            invitations={invitationResponses}
          />
        </div>

        {isAdminOrOwner && (
          <div className="border-t pt-6 space-y-3">
            <h3 className="text-base font-semibold">Invite a member</h3>
            <InviteMemberForm labId={lab.id} />
          </div>
        )}
      </div>
    </div>
  )
}
