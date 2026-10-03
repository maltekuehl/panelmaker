import { cn } from "@/lib/utils"
import { AlertCircle, Check } from "lucide-react"

export type StepState = "current" | "complete" | "attention" | "upcoming"

export type StepItem = {
  title: string
  summary: string
  state: StepState
}

export function SubmissionStepper({ steps, onSelect }: { steps: StepItem[]; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="Submission steps">
      <ol className="grid gap-3 sm:gap-6" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => (
          <li key={step.title} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`${step.title}, ${step.summary}`}
              aria-current={step.state === "current" ? "step" : undefined}
              className="group flex w-full min-w-0 flex-col gap-2.5 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "h-1 w-full rounded-full transition-colors",
                  step.state === "current" && "bg-primary",
                  step.state === "complete" && "bg-primary/40 group-hover:bg-primary/60",
                  step.state === "attention" && "bg-destructive/60 group-hover:bg-destructive/80",
                  step.state === "upcoming" && "bg-muted group-hover:bg-muted-foreground/30",
                )}
              />
              <span className="flex min-w-0 items-start gap-2.5">
                <StepMarker index={index} state={step.state} />
                <span className="min-w-0 space-y-0.5">
                  <span
                    className={cn(
                      "truncate text-sm font-medium sm:block",
                      step.state === "current" ? "block" : "hidden",
                      step.state === "upcoming" && "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-xs sm:block",
                      step.state === "attention" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {step.summary}
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function StepMarker({ index, state }: { index: number; state: StepState }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
        state === "current" && "border-primary bg-primary text-primary-foreground",
        state === "complete" && "border-primary/40 bg-primary/10 text-primary",
        state === "attention" && "border-destructive/60 bg-destructive/10 text-destructive",
        state === "upcoming" && "border-border text-muted-foreground",
      )}
    >
      {state === "complete" ? (
        <Check className="size-3.5" />
      ) : state === "attention" ? (
        <AlertCircle className="size-3.5" />
      ) : (
        index + 1
      )}
    </span>
  )
}
