"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Loader2, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface InviteMemberFormProps {
  labId: string
}

export function InviteMemberForm({ labId }: InviteMemberFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("MEMBER")
  const [maxUses, setMaxUses] = useState("")
  const [loading, setLoading] = useState(false)
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAcceptUrl(null)

    try {
      const body: Record<string, unknown> = { role }
      if (email.trim()) body.email = email.trim()
      if (maxUses.trim()) {
        const n = parseInt(maxUses, 10)
        if (!isNaN(n) && n > 0) body.maxUses = n
      }

      const res = await fetch(`/api/labs/${labId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create invitation")
        return
      }

      setAcceptUrl(data.acceptUrl)
      toast.success(email.trim() ? "Invitation created" : "Invite link created")
      setEmail("")
      setMaxUses("")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
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
          <p className="text-xs text-muted-foreground">Leave blank to create a shareable invite link</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5 flex-1 min-w-32">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
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
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {email.trim() ? "Send invitation" : "Create invite link"}
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
