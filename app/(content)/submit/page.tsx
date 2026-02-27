import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { SubmissionForm } from "@/components/submit/submission-form"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Submit Experimental Report - PanelMaker",
  description: "Contribute validated antibody protocols to the PanelMaker database.",
}

export default function SubmitPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Submit Report" }]} />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit Experimental Report</h1>
        <p className="text-muted-foreground max-w-2xl">
          Share your validated antibody protocols with the community. All submissions undergo peer review before being
          added to the public database.
        </p>
      </div>

      <SubmissionForm />
    </div>
  )
}
