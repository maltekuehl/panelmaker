"use client"

import { OptionSelect } from "@/components/option-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiRequest } from "@/hooks/use-api-request"
import { LAB_ROLE_LABELS } from "@/lib/constants"
import { Copy, Link as LinkIcon, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

const INVITE_ROLE_OPTIONS = (["MEMBER", "ADMIN", "VIEWER"] as const).map((value) => ({
  value,
  label: LAB_ROLE_LABELS[value],
}))

interface InviteMemberFormProps {
  labId: string
}

export function InviteMemberForm({ labId }: InviteMemberFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("MEMBER")
  const [maxUses, setMaxUses] = useState("")
  const { pending, request } = useApiRequest()
  const loading = pending !== null
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAcceptUrl(null)

    const body: Record<string, unknown> = { role }
    if (email.trim()) body.email = email.trim()
    if (maxUses.trim()) {
      const n = parseInt(maxUses, 10)
      if (!isNaN(n) && n > 0) body.maxUses = n
    }

    const data = await request<{ acceptUrl: string }>(true, {
      url: `/api/labs/${labId}/invitations`,
      method: "POST",
      body,
      errorMessage: "Failed to create invitation",
    })
    if (!data) return
    setAcceptUrl(data.acceptUrl)
    toast.success(email.trim() ? "Invitation created" : "Invite link created")
    setEmail("")
    setMaxUses("")
    router.refresh()
  }

  async function copyLink() {
    if (!acceptUrl) return
    try {
      await navigator.clipboard.writeText(acceptUrl)
      toast.success("Invite link copied")
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email (optional)</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@institution.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Optional. If set, only this address can accept the link.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5 flex-1 min-w-32">
            <Label htmlFor="invite-role">Role</Label>
            <OptionSelect
              id="invite-role"
              value={role}
              onValueChange={setRole}
              options={INVITE_ROLE_OPTIONS}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5 w-28">
            <Label htmlFor="invite-max-uses">Max uses</Label>
            <Input
              id="invite-max-uses"
              type="number"
              min={1}
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} size="sm">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
          Create invitation
        </Button>
      </form>

      {acceptUrl && (
        <div className="space-y-1.5">
          <Label>Invite link</Label>
          <div className="flex gap-2">
            <Input value={acceptUrl} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              <Copy className="size-4" />
              Copy link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Share this link once. It will not be shown again.</p>
        </div>
      )}
    </div>
  )
}
