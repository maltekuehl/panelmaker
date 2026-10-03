"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isValidDonorAge } from "@/models/experiment/schema"
import { ArrowLeft, ArrowRight, CircleCheck, Loader2, Send } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AntibodyAccordion } from "./antibody-accordion"
import type { AssessmentTerms } from "./assessment-fields"
import { ExperimentDetailsSection } from "./experiment-details-section"
import { ExperimentMethodSection } from "./experiment-method-section"
import { SubmissionStepper, type StepState } from "./submission-stepper"
import {
  buildBatchPayload,
  emptyContext,
  emptyRow,
  extractOrganismId,
  isContextComplete,
  pruneFovs,
  validateRows,
  type AntibodyRow,
  type ExperimentContext,
  type Fov,
} from "./types"

const STEPS: { title: string; heading: string; description?: string }[] = [
  { title: "Experiment", heading: "Experiment details" },
  {
    title: "Sample & method",
    heading: "Sample and method",
    description: "Shared by every antibody in this run. All fields are optional.",
  },
  { title: "Antibodies", heading: "Antibodies" },
]

const LAST_STEP = STEPS.length - 1

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function SubmissionForm({ labs, terms }: { labs: { id: string; name: string }[]; terms: AssessmentTerms }) {
  const { data: session } = useSession()

  const [context, setContext] = useState<ExperimentContext>(emptyContext)
  const [step, setStep] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
  const [validated, setValidated] = useState<Set<number>>(() => new Set())
  const [rows, setRows] = useState<AntibodyRow[]>(() => [emptyRow()])
  const [fovs, setFovs] = useState<Fov[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedExperimentId, setSubmittedExperimentId] = useState<string | null>(null)

  const organismId = context.species ? extractOrganismId(context.species.id) : undefined

  const hasUnsavedWork = rows.some((r) => r.markerName || r.images.length > 0) || context.name.trim().length > 0

  useEffect(() => {
    if (!hasUnsavedWork || isSubmitting) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasUnsavedWork, isSubmitting])

  const rowErrors = useMemo(() => validateRows(rows, fovs), [rows, fovs])
  const invalidSet = useMemo(() => new Set(rowErrors.map((e) => `${e.key}:${e.field}`)), [rowErrors])
  const invalid = (key: string, field: keyof AntibodyRow) => validated.has(2) && invalidSet.has(`${key}:${field}`)

  const donorAge = context.specimen.donorAge.trim()
  const stepValid = [
    isContextComplete(context),
    donorAge.length === 0 || isValidDonorAge(donorAge),
    rowErrors.length === 0,
  ]
  const incompleteRows = new Set(rowErrors.map((e) => e.key)).size

  const stepState = (index: number): StepState => {
    if (index === step) return "current"
    if (!visited.has(index)) return "upcoming"
    return stepValid[index] ? "complete" : "attention"
  }

  const methodSummary = [context.species?.label, context.tissue?.label, context.imagingMethod?.label]
    .filter(Boolean)
    .join(", ")

  const stepSummaries = [
    context.name.trim() || "Name required",
    stepValid[1] ? methodSummary || "Optional context" : "Check the donor age",
    incompleteRows > 0 && visited.has(2)
      ? `${plural(incompleteRows, "antibody", "antibodies")} incomplete`
      : plural(rows.length, "antibody", "antibodies"),
  ]

  function goTo(index: number) {
    setStep(index)
    setVisited((prev) => new Set(prev).add(index))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function markValidated(index: number) {
    setValidated((prev) => new Set(prev).add(index))
  }

  function handleNext() {
    if (!stepValid[step]) {
      markValidated(step)
      if (step === 0) document.getElementById("experiment-name")?.focus()
      if (step === 1)
        toast.error("The donor age is not in a recognised format. Fix it under donor and specimen details.")
      return
    }
    goTo(step + 1)
  }

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

  function startNewRun() {
    setSubmittedExperimentId(null)
    setContext(emptyContext)
    setRows([emptyRow()])
    setFovs([])
    setStep(0)
    setVisited(new Set([0]))
    setValidated(new Set())
  }

  async function handleSubmit() {
    if (!session?.user) {
      toast.error("You must be signed in to submit a report.")
      return
    }

    const firstInvalid = stepValid.findIndex((valid) => !valid)
    if (firstInvalid !== -1) {
      setValidated(new Set([0, 1, 2]))
      setVisited(new Set([0, 1, 2]))
      if (firstInvalid !== step) goTo(firstInvalid)
      if (firstInvalid === 0) toast.error("Add an experiment name before submitting.")
      else if (firstInvalid === 1) toast.error("Fix the donor age before submitting.")
      else
        toast.error(
          `Fix ${plural(rowErrors.length, "issue", "issues")} across ${plural(
            incompleteRows,
            "antibody",
            "antibodies",
          )} before submitting.`,
        )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBatchPayload(context, rows, fovs)),
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
        const remaining = rows.filter((_, i) => failedIndices.has(i))
        setRows(remaining)
        setFovs((prev) => pruneFovs(prev, remaining))
        toast.error(
          `${plural(createdCount, "report", "reports")} submitted. ${failed.length} failed: ${failed
            .map((f) => `${f.markerName} (${f.error})`)
            .join("; ")}`,
        )
        return
      }

      const experimentId: string | undefined = body?.created?.[0]?.experimentId
      toast.success(`${plural(createdCount, "report", "reports")} submitted, pending review.`)
      setSubmittedExperimentId(experimentId ?? null)
      setRows([emptyRow()])
      setFovs([])
      setValidated(new Set())
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const current = STEPS[step]
  const isLast = step === LAST_STEP
  const canSkip = !isLast && !stepValid[step]

  return (
    <div className="space-y-8 pb-20">
      <SubmissionStepper
        steps={STEPS.map((s, index) => ({ title: s.title, summary: stepSummaries[index], state: stepState(index) }))}
        onSelect={goTo}
      />

      {submittedExperimentId ? (
        <div className="flex flex-col items-center gap-4 rounded-md border px-6 py-12 text-center">
          <CircleCheck className="size-10 text-primary" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Reports submitted</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              A PanelMaker admin will review them before they appear in the public database.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/experiment/${submittedExperimentId}`}>View experiment</Link>
            </Button>
            <Button variant="outline" onClick={() => setSubmittedExperimentId(null)}>
              Add more antibodies to this run
            </Button>
            <Button onClick={startNewRun}>Start a new run</Button>
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{current.heading}</h2>
              {current.description && <p className="text-sm text-muted-foreground">{current.description}</p>}
            </div>

            {step === 0 && (
              <ExperimentDetailsSection
                context={context}
                onChange={handleContextChange}
                nameInvalid={validated.has(0) && !stepValid[0]}
                labs={labs}
              />
            )}
            {step === 1 && <ExperimentMethodSection context={context} onChange={handleContextChange} />}
            {step === 2 && (
              <AntibodyAccordion
                rows={rows}
                fovs={fovs}
                onChange={(nextRows, nextFovs) => {
                  setRows(nextRows)
                  setFovs(nextFovs)
                }}
                organismId={organismId}
                invalid={invalid}
                hasLabs={labs.length > 0}
                terms={terms}
              />
            )}
          </section>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur transition-[left] duration-200 ease-linear supports-[backdrop-filter]:bg-background/80 md:left-(--sidebar-width) md:[.peer[data-state=collapsed]~*_&]:left-(--sidebar-width-icon)">
            <div className="container mx-auto flex items-center gap-3 px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => goTo(step - 1)}
                className={cn(step === 0 && "invisible")}
                aria-hidden={step === 0 || undefined}
                tabIndex={step === 0 ? -1 : undefined}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
                Step {step + 1} of {STEPS.length}
              </p>

              <div className="ml-auto flex items-center gap-2">
                {!isLast && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => goTo(step + 1)}
                    className={cn(!canSkip && "invisible")}
                    aria-hidden={!canSkip || undefined}
                    tabIndex={canSkip ? undefined : -1}
                  >
                    Skip for now
                  </Button>
                )}

                {isLast ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !session?.user}
                    className="sm:min-w-52"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Submitting…
                      </>
                    ) : !session?.user ? (
                      "Sign in to submit"
                    ) : (
                      <>
                        Submit {plural(rows.length, "report", "reports")}
                        <Send className="size-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext} className="sm:min-w-52">
                    {stepValid[step] ? `Next: ${STEPS[step + 1].title}` : "Validate & next"}
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
