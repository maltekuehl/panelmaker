"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SubmissionAccess } from "@/lib/generated/prisma/enums"
import { CheckCircle2, Clock, Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function RequestSubmissionAccess({ initialAccess }: { initialAccess: SubmissionAccess }) {
  const [access, setAccess] = useState<SubmissionAccess>(initialAccess)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRequest() {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/user/submission-access", { method: "POST" })
      if (!response.ok) throw new Error("Request failed")
      const data: { access: SubmissionAccess } = await response.json()
      setAccess(data.access)
      toast.success("Verification requested. An admin will review your account.")
    } catch {
      toast.error("Could not send your request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const requested = access === "REQUESTED"

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="size-5" />
          Verification required to submit
        </CardTitle>
        <CardDescription>
          To keep the public database trustworthy, an admin reviews each account before it can submit experimental
          reports. You can keep designing and saving panels in the meantime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requested ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <span>Your request is pending review. We will email you once your account is verified.</span>
          </div>
        ) : (
          <Button onClick={handleRequest} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Request verification
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
