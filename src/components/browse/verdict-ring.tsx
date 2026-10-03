import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RECOMMENDATION_LABELS } from "@/lib/constants"
import type { Recommendation } from "@/lib/generated/prisma/enums"
import type { VerdictCounts } from "@/models/experimental-report/transforms"

const RADIUS = 15.9155
const GAP = 2
const SEGMENTS: { key: Recommendation; className: string; swatch: string }[] = [
  { key: "RECOMMENDED", className: "stroke-success", swatch: "bg-success" },
  { key: "WITH_CAVEATS", className: "stroke-warning", swatch: "bg-warning" },
  { key: "NOT_RECOMMENDED", className: "stroke-destructive", swatch: "bg-destructive" },
]

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

// A ring over every report in the row: one arc per verdict, the bare track for reports without one.
// The circle's circumference is 100 units, so arc lengths are percentages.
export function VerdictRing({ counts }: { counts: VerdictCounts }) {
  const total = counts.RECOMMENDED + counts.WITH_CAVEATS + counts.NOT_RECOMMENDED + counts.unrated
  const present = SEGMENTS.filter(({ key }) => counts[key] > 0)
  const gap = present.length > 1 || counts.unrated > 0 ? GAP : 0
  const lengths = present.map(({ key }) => (counts[key] / total) * 100)
  const arcs = present.map(({ key, className }, index) => ({
    key,
    className,
    dash: Math.max(lengths[index] - gap, 0.5),
    offset: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  }))
  const recommendedShare = percent(counts.RECOMMENDED, total)
  const summary = SEGMENTS.map(({ key }) => `${RECOMMENDATION_LABELS[key]}: ${counts[key]}`).join(", ")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center gap-1.5 tabular-nums">
          <svg viewBox="0 0 36 36" className="size-6 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r={RADIUS} fill="none" className="stroke-muted" strokeWidth="4" />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx="18"
                cy="18"
                r={RADIUS}
                fill="none"
                strokeWidth="4"
                className={arc.className}
                strokeDasharray={`${arc.dash} ${100 - arc.dash}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
          </svg>
          <span className="text-xs text-muted-foreground">{total > 0 ? `${recommendedShare}%` : "None"}</span>
          <span className="sr-only">{summary}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <dl className="space-y-0.5 text-xs">
          {SEGMENTS.map(({ key, swatch }) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${swatch}`} />
              <dt className="flex-1">{RECOMMENDATION_LABELS[key]}</dt>
              <dd className="tabular-nums">
                {counts[key]} ({percent(counts[key], total)}%)
              </dd>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-muted" />
            <dt className="flex-1">No verdict</dt>
            <dd className="tabular-nums">{counts.unrated}</dd>
          </div>
        </dl>
      </TooltipContent>
    </Tooltip>
  )
}
