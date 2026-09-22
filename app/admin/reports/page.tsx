import { AdminPage } from "@/components/admin/admin-page"
import AdminReportsList from "@/components/admin/admin-reports-list"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Report Management | Admin | PanelMaker",
  description: "Manage reported content and issues.",
}

export default function AdminReportsPage() {
  return (
    <AdminPage
      path="/admin/reports"
      title="Report Management"
      description="Manage reported content and review submissions."
    >
      <AdminReportsList />
    </AdminPage>
  )
}
