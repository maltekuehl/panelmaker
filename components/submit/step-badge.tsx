import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function StepBadge({ n, state }: { n: number; state: "active" | "done" | "disabled" }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
        state === "active" && "border-primary bg-primary text-primary-foreground",
        state === "done" && "border-primary/40 bg-primary/10 text-primary",
        state === "disabled" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {state === "done" ? <Check className="size-3.5" /> : n}
    </span>
  )
}
