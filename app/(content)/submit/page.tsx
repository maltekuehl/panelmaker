import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { SubmissionForm } from "@/components/submit/submission-form"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { getLabsForUser } from "@/models/lab"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Submit Experimental Report | PanelMaker",
  description: "Contribute validated antibody protocols to the PanelMaker database.",
}

export default async function SubmitPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/submit"))
  }

  const labsWithRole = await getLabsForUser(user.id)

  const labs = labsWithRole.map(({ lab }) => ({ id: lab.id, name: lab.name }))

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Submit Report" }]} />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit Experimental Report</h1>
        <p className="text-muted-foreground max-w-2xl">
          Set your experiment context once, then add every antibody from the run below. Each one is submitted as its own
          report. A PanelMaker admin reviews every submission before it is added to the public database.
        </p>
      </div>

      <SubmissionForm labs={labs} />
    </div>
  )
}
