import AdminReportsList from "@/components/admin/admin-reports-list"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { Loader2 } from "lucide-react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Report Management | Admin | PanelMaker",
  description: "Manage reported content and issues.",
}

export default async function AdminReportsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/admin/reports"))
  }

  if (!user.isAdmin) {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Report Management</h1>
        <p className="text-muted-foreground">Manage reported content and review submissions.</p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <AdminReportsList />
      </Suspense>
    </div>
  )
}
