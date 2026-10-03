"use client"

import { Button } from "@/components/ui/button"
import { useApiRequest } from "@/hooks/use-api-request"
import { Check, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function JoinInvitation({ token, canDecline }: { token: string; canDecline: boolean }) {
  const router = useRouter()
  const { pending: loading, request } = useApiRequest<"accept" | "decline">()

  async function accept() {
    const data = await request<{ lab: { name: string; slug: string } }>("accept", {
      url: "/api/invitations/accept",
      method: "POST",
      body: { token },
      errorMessage: "Could not accept the invitation",
      holdPendingOnSuccess: true,
    })
    if (!data) return
    toast.success(`You joined ${data.lab.name}`)
    router.push(`/labs/${data.lab.slug}`)
    router.refresh()
  }

  async function decline() {
    const data = await request("decline", {
      url: "/api/invitations/decline",
      method: "POST",
      body: { token },
      errorMessage: "Could not decline the invitation",
      holdPendingOnSuccess: true,
    })
    if (!data) return
    toast.success("Invitation declined")
    router.push("/labs")
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={accept} disabled={loading !== null}>
        {loading === "accept" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Accept invitation
      </Button>
      {canDecline ? (
        <Button variant="outline" onClick={decline} disabled={loading !== null}>
          {loading === "decline" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          Decline
        </Button>
      ) : null}
    </div>
  )
}
