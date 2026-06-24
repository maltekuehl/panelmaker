import { auth } from "@/auth"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { SubmissionForm } from "@/components/submit/submission-form"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Submit Experimental Report - PanelMaker",
  description: "Contribute validated antibody protocols to the PanelMaker database.",
}

export default async function SubmitPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/signin")
  }
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Submit Report" }]} />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit Experimental Report</h1>
        <p className="text-muted-foreground max-w-2xl">
          Set your experiment context once, then add every antibody from the run below. Each one is submitted as its own
          report. All submissions undergo peer review before being added to the public database.
        </p>
      </div>

      <SubmissionForm />
    </div>
  )
}
