"use client"

import { Button } from "@/components/ui/button"
import type { AccessStatus } from "@/lib/generated/prisma/enums"
import { CheckCircle2, Clock, Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function RequestSubmissionAccess({ initialAccess }: { initialAccess: AccessStatus }) {
  const [access, setAccess] = useState<AccessStatus>(initialAccess)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleRequest() {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/user/submission-access", { method: "POST" })
      if (!response.ok) throw new Error("Request failed")
      const data: { status: AccessStatus } = await response.json()
      setAccess(data.status)
      toast.success("Verification requested. An admin will review your account.")
    } catch {
      toast.error("Could not send your request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const requested = access === "REQUESTED"

  return (
    <div className="max-w-2xl space-y-3 rounded-md border p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="size-5" />
        Verification required to submit
      </h2>
      <p className="text-sm text-muted-foreground">
        To keep the public database trustworthy, an admin reviews each account before it can submit experimental
        reports. You can keep designing and saving panels in the meantime.
      </p>
      {requested ? (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>
            Your request is pending review. Once an admin verifies your account, this page will let you submit reports.
          </span>
        </div>
      ) : (
        <Button onClick={handleRequest} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Request verification
        </Button>
      )}
    </div>
  )
}
