import { ApiKeysSection } from "@/components/settings/api-keys-section"
import { getSessionUser } from "@/lib/auth"
import { profileHref, signInUrl } from "@/lib/routes"
import { getUserProfile } from "@/models/user"
import { ArrowRight } from "lucide-react"
import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import DataExportSection from "./data-export-section"
import DeleteAccountSection from "./delete-account-section"
import ProfileSection from "./profile-section"

export const metadata: Metadata = {
  title: "Settings | PanelMaker",
  description: "Manage your account settings",
}

export default async function SettingsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/settings"))
  }

  const profile = await getUserProfile(user.id)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
        <Link
          href={profileHref(user.id)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View your public profile
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="space-y-8">
        <ProfileSection
          email={user.email ?? null}
          name={profile?.name ?? user.name ?? null}
          orcid={profile?.orcid ?? null}
          institution={profile?.institution ?? null}
          institutionId={profile?.institutionId ?? null}
        />

        <ApiKeysSection endpoint="/api/settings/api-keys" />

        <DataExportSection />

        {!user.isAdmin && <DeleteAccountSection />}
      </div>
    </div>
  )
}
