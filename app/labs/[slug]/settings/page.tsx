import { auth } from "@/auth"
import { DeleteLabButton } from "@/components/lab/delete-lab-button"
import { LabForm } from "@/components/lab/lab-form"
import { LabPageHeader } from "@/components/lab/lab-page-header"
import { ApiKeysSection } from "@/components/settings/api-keys-section"
import { getLabBySlug, getUserLabRole } from "@/models/lab"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

interface LabSettingsPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LabSettingsPageProps): Promise<Metadata> {
  const { slug } = await params
  const lab = await getLabBySlug(slug)
  if (!lab) return { title: "Lab Not Found | PanelMaker" }
  return { title: `Settings | ${lab.name} | PanelMaker`, robots: { index: false, follow: false } }
}

export default async function LabSettingsPage({ params }: LabSettingsPageProps) {
  const { slug } = await params

  const [lab, session] = await Promise.all([getLabBySlug(slug), auth()])

  if (!lab) {
    notFound()
  }

  if (!session?.user?.id) {
    notFound()
  }

  const role = await getUserLabRole(session.user.id, lab.id)

  if (role !== "ADMIN" && role !== "OWNER") {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <LabPageHeader lab={lab} role={role} crumb="Settings" />

      <div className="max-w-2xl space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Lab details</h2>
            <p className="text-sm text-muted-foreground">Update your lab&apos;s name, institution, and profile.</p>
          </div>
          <LabForm
            mode="edit"
            initial={{
              id: lab.id,
              name: lab.name,
              description: lab.description,
              institution: lab.institution,
              institutionId: lab.institutionId,
              website: lab.website,
              isPublicProfile: lab.isPublicProfile,
            }}
          />
        </section>

        <ApiKeysSection
          endpoint={`/api/labs/${lab.id}/api-keys`}
          title="Shared model API keys"
          description="Provider keys shared with every member of this lab. Members can use these models in the assistant without adding their own keys. Keys are encrypted at rest and never shown again."
        />

        {role === "OWNER" && (
          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground">
                Deleting this lab is permanent and cannot be undone. All members will lose access immediately.
              </p>
            </div>
            <DeleteLabButton labId={lab.id} labName={lab.name} />
          </section>
        )}
      </div>
    </div>
  )
}
