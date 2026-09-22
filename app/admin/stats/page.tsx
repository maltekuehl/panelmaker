import AdminStats from "@/components/admin/admin-stats"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Statistics | Admin | PanelMaker",
  description: "Overview of system activity and community contributions.",
}

export default async function AdminStatsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/admin/stats"))
  }

  if (!user.isAdmin) {
    redirect("/")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <p className="text-muted-foreground mt-2">Overview of system activity and community contributions</p>
      </div>
      <AdminStats />
    </div>
  )
}
