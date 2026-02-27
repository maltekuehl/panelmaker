"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type ProfileData = {
  name: string | null
  email: string | null
  orcid: string | null
  institution: string | null
}

export default function ProfileSection({ name, email }: { name: string | null; email: string | null }) {
  const [orcid, setOrcid] = useState("")
  const [institution, setInstitution] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [original, setOriginal] = useState<{ orcid: string; institution: string }>({ orcid: "", institution: "" })

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me")
      if (!res.ok) return
      const json = await res.json()
      const data = (json.data ?? json) as ProfileData
      const o = data.orcid ?? ""
      const i = data.institution ?? ""
      setOrcid(o)
      setInstitution(i)
      setOriginal({ orcid: o, institution: i })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const hasChanges = orcid !== original.orcid || institution !== original.institution

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orcid: orcid.trim() || null,
          institution: institution.trim() || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        const detail = json.details?.[0]?.message ?? json.error ?? "Failed to save"
        toast.error(detail)
        return
      }

      setOriginal({ orcid: orcid.trim(), institution: institution.trim() })
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your public researcher profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Name</Label>
            <p className="text-sm text-muted-foreground mt-1">{name || "Not set"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm text-muted-foreground mt-1">{email || "Not set"}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading profile...</span>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="orcid" className="text-sm font-medium">
                ORCID
              </Label>
              <p className="text-xs text-muted-foreground mb-1">
                Your{" "}
                <a
                  href="https://orcid.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ORCID iD
                </a>{" "}
                links your PanelMaker contributions to your research identity.
              </p>
              <Input
                id="orcid"
                placeholder="0000-0002-1234-5678"
                value={orcid}
                onChange={(e) => setOrcid(e.target.value)}
                className="max-w-xs font-mono"
              />
            </div>

            <div>
              <Label htmlFor="institution" className="text-sm font-medium">
                Institution
              </Label>
              <Input
                id="institution"
                placeholder="e.g., Harvard Medical School"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="max-w-md"
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Profile
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
