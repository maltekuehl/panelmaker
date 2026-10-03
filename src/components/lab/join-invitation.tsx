"use client"

import { Button } from "@/components/ui/button"
import { Check, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function JoinInvitation({ token, canDecline }: { token: string; canDecline: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null)

  async function accept() {
    setLoading("accept")
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not accept the invitation")
      toast.success(`You joined ${data.lab.name}`)
      router.push(`/labs/${data.lab.slug}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
      setLoading(null)
    }
  }

  async function decline() {
    setLoading("decline")
    try {
      const response = await fetch("/api/invitations/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not decline the invitation")
      toast.success("Invitation declined")
      router.push("/labs")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
      setLoading(null)
    }
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
