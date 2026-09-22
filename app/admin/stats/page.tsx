import { AdminPage } from "@/components/admin/admin-page"
import AdminStats from "@/components/admin/admin-stats"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Statistics | Admin | PanelMaker",
  description: "Overview of system activity and community contributions.",
}

export default function AdminStatsPage() {
  return (
    <AdminPage
      path="/admin/stats"
      title="Statistics"
      description="Overview of system activity and community contributions"
    >
      <AdminStats />
    </AdminPage>
  )
}
