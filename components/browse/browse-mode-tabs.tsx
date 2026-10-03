"use client"

import { SegmentedTabs } from "@/components/data-table/segmented-tabs"
import { browseMarkerParsers } from "@/lib/data-table"
import { useQueryStates } from "nuqs"

const MODES = [
  { value: "antibodies", label: "Antibodies" },
  { value: "markers", label: "Cell markers" },
  { value: "reports", label: "Reports" },
  { value: "experiments", label: "Experiments" },
  { value: "panels", label: "Panels" },
] as const

type Mode = (typeof MODES)[number]["value"]

export function BrowseModeTabs() {
  const [params, setParams] = useQueryStates(browseMarkerParsers, { shallow: false })

  return (
    <SegmentedTabs<Mode>
      items={[...MODES]}
      value={params.mode}
      label="Browse mode"
      onChange={(mode) => setParams({ mode, page: 1 })}
    />
  )
}
