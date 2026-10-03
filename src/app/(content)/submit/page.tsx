import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { SubmissionForm } from "@/components/submit/submission-form"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { getStainingIssues, getValidationMethods } from "@/models/experimental-report"
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

  const [labsWithRole, validationMethods, stainingIssues] = await Promise.all([
    getLabsForUser(user.id),
    getValidationMethods(),
    getStainingIssues(),
  ])

  const labs = labsWithRole.map(({ lab }) => ({ id: lab.id, name: lab.name }))

  return (
    <div className="container mx-auto space-y-8 px-4 py-6">
      <CustomBreadcrumbs items={[{ label: "Submit Report" }]} />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit Experimental Report</h1>
        <p className="text-muted-foreground max-w-2xl">
          Describe the run once, then add every antibody you stained in it. Each antibody becomes its own report, and an
          admin reviews every submission before it goes public.
        </p>
      </div>

      <SubmissionForm labs={labs} terms={{ validationMethods, stainingIssues }} />
    </div>
  )
}
