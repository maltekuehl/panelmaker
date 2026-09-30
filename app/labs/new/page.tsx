import { LabForm } from "@/components/lab/lab-form"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { redirect } from "next/navigation"

export default async function NewLabPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/labs/new"))
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Labs", href: "/labs" }, { label: "New lab" }]} />

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">New lab</h1>
        <p className="text-muted-foreground">Create a lab to share panels and antibody inventory with your team.</p>
      </div>

      <div className="rounded-xl border p-4 sm:p-6">
        <LabForm mode="create" />
      </div>
    </div>
  )
}
