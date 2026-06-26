import { auth } from "@/auth"
import { ApiKeysSection } from "@/components/settings/api-keys-section"
import { isUserAdmin } from "@/lib/auth"
import { ArrowRight } from "lucide-react"
import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import DataExportSection from "./data-export-section"
import DeleteAccountSection from "./delete-account-section"
import ProfileSection from "./profile-section"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings",
}

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/signin")
  }

  const isAdmin = await isUserAdmin(session.user.id)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
        <Link
          href={`/profile/${session.user.id}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View your public profile
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="space-y-8">
        <ProfileSection name={session.user.name ?? null} email={session.user.email ?? null} />

        <ApiKeysSection endpoint="/api/settings/api-keys" />

        <DataExportSection />

        {!isAdmin && <DeleteAccountSection />}
      </div>
    </div>
  )
}
