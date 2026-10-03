import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Admin | PanelMaker",
  description: "Administrative tools and user management",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/admin/user"))
  }

  if (!user.isAdmin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <div className="h-6 w-px bg-border" />
              <nav className="flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  href="/admin/user"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  User Management
                </Link>
                <Link
                  href="/admin/reports"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reports
                </Link>
                <Link
                  href="/admin/stats"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Statistics
                </Link>
              </nav>
            </div>
            <div className="text-sm text-muted-foreground">Logged in as {user.name || user.email}</div>
          </div>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  )
}
