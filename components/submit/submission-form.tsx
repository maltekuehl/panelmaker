"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2, Save } from "lucide-react"
import { useSession } from "next-auth/react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AntibodyAccordion } from "./antibody-accordion"
import { ExperimentDetailsSection } from "./experiment-details-section"
import { ExperimentMethodSection } from "./experiment-method-section"
import { StepBadge } from "./step-badge"
import {
  buildBatchPayload,
  emptyContext,
  emptyRow,
  extractOrganismId,
  validateRows,
  type AntibodyRow,
  type ExperimentContext,
} from "./types"

export function SubmissionForm({ labs }: { labs: { id: string; name: string }[] }) {
  const { data: session } = useSession()

  const [context, setContext] = useState<ExperimentContext>(emptyContext)
  const [step, setStep] = useState(1)
  const [furthest, setFurthest] = useState(1)
  const [rows, setRows] = useState<AntibodyRow[]>(() => [emptyRow()])
  const [showErrors, setShowErrors] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const antibodiesReached = furthest >= 3
  const organismId = context.species ? extractOrganismId(context.species.id) : undefined

  const sectionState = (n: number): "active" | "done" | "disabled" =>
    step === n ? "active" : furthest >= n ? "done" : "disabled"

  const advanceTo = (n: number) => {
    setStep(n)
    setFurthest((f) => Math.max(f, n))
  }

  const rowErrors = useMemo(() => validateRows(rows), [rows])
  const invalidSet = useMemo(() => new Set(rowErrors.map((e) => `${e.key}:${e.field}`)), [rowErrors])
  const invalid = (key: string, field: keyof AntibodyRow) => showErrors && invalidSet.has(`${key}:${field}`)

  function handleContextChange(next: ExperimentContext) {
    if (context.species?.id && next.species?.id !== context.species.id) {
      const hadProtein = rows.some((r) => r.markerProtein)
      if (hadProtein) {
        setRows((prev) => prev.map((r) => (r.markerProtein ? { ...r, markerProtein: null, markerName: "" } : r)))
        toast.info("Species changed. Protein selections cleared.")
      }
    }
    setContext(next)
  }

  async function handleSubmit() {
    if (!session?.user) {
      toast.error("You must be signed in to submit a report.")
      return
    }
    if (rowErrors.length > 0) {
      setShowErrors(true)
      const affected = new Set(rowErrors.map((e) => e.key)).size
      toast.error(`Fix ${rowErrors.length} issue(s) across ${affected} antibody row(s) before submitting.`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBatchPayload(context, rows)),
      })

      if (res.status === 401) {
        toast.error("You must be signed in to submit a report.")
        return
      }
      if (res.status === 429) {
        toast.error("You have reached the submission limit. Please try again later.")
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const details = body?.details ? `: ${JSON.stringify(body.details)}` : ""
        toast.error((body?.error ?? "Failed to submit reports. Please try again.") + details)
        return
      }

      const body = await res.json()
      const createdCount: number = body?.createdCount ?? 0
      const failed: { index: number; markerName: string; error: string }[] = body?.failed ?? []

      if (failed.length > 0) {
        const failedIndices = new Set(failed.map((f) => f.index))
        setRows((prev) => prev.filter((_, i) => failedIndices.has(i)))
        toast.error(
          `${createdCount} report(s) submitted. ${failed.length} failed: ${failed
            .map((f) => `${f.markerName} (${f.error})`)
            .join("; ")}`,
        )
        return
      }

      toast.success(`${createdCount} report(s) submitted, pending review.`)
      setRows([emptyRow()])
      setShowErrors(false)
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="divide-y overflow-hidden rounded-xl border">
        <ExperimentDetailsSection
          context={context}
          onChange={handleContextChange}
          state={sectionState(1)}
          onEdit={() => setStep(1)}
          onDone={() => advanceTo(2)}
          labs={labs}
        />

        <ExperimentMethodSection
          context={context}
          onChange={handleContextChange}
          state={sectionState(2)}
          onEdit={() => setStep(2)}
          onDone={() => advanceTo(3)}
        />

        <section className={cn(!antibodiesReached && "opacity-60")}>
          <div className="flex items-center gap-3 px-4 py-3">
            <StepBadge n={3} state={antibodiesReached ? "active" : "disabled"} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Antibodies{antibodiesReached ? ` (${rows.length})` : ""}</h2>
              <p className="text-xs text-muted-foreground">
                {antibodiesReached
                  ? "Pick from the registry to auto-fill, or type details in. Each antibody needs at least one image."
                  : "Complete the steps above to start adding antibodies."}
              </p>
            </div>
          </div>

          {antibodiesReached && (
            <div className="px-4 pb-4">
              <AntibodyAccordion
                rows={rows}
                onChange={setRows}
                method={context.method}
                organismId={organismId}
                invalid={invalid}
                hasLabs={labs.length > 0}
              />
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex items-center justify-between gap-4 px-0">
          <p className="text-sm text-muted-foreground">
            {antibodiesReached
              ? `${rows.length} antibod${rows.length === 1 ? "y" : "ies"} · shared context applied to all`
              : "Complete the steps above to begin"}
          </p>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !session?.user || !antibodiesReached}
            className="min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : !session?.user ? (
              "Sign in to submit"
            ) : !antibodiesReached ? (
              "Submit reports"
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit {rows.length} report{rows.length === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
