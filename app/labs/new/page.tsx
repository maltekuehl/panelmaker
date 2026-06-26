import { auth } from "@/auth"
import { LabForm } from "@/components/lab/lab-form"
import { CustomBreadcrumbs } from "@/components/shared/custom-breadcrumbs"
import { getAccessState } from "@/lib/auth"
import { ShieldCheck } from "lucide-react"
import { redirect } from "next/navigation"

export default async function NewLabPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/labs/new")
  }

  const accessState = await getAccessState(session.user.id)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <CustomBreadcrumbs items={[{ label: "Labs", href: "/labs" }, { label: "New lab" }]} />

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">New lab</h1>
        <p className="text-muted-foreground">Create a lab to share panels and antibody inventory with your team.</p>
      </div>

      {accessState.verified ? (
        <LabForm mode="create" />
      ) : (
        <div className="max-w-2xl space-y-3 rounded-md border p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5" />
            Verification required to create a lab
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Your account must be verified by an administrator before you can create a lab. This helps keep the
              platform trustworthy for the whole community.
            </p>
            <p>
              To request access, go to your profile settings or contact a PanelMaker administrator directly. Once
              verified, you can come back here to create a lab.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
