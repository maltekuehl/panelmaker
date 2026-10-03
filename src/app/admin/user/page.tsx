import { AdminPage } from "@/components/admin/admin-page"
import { Metadata } from "next"
import UserList from "./UserList"

export const metadata: Metadata = {
  title: "User Management | Admin | PanelMaker",
  description: "Manage community members and their access",
}

export default function AdminUserPage() {
  return (
    <AdminPage
      path="/admin/user"
      title="User Management"
      description="Manage community members, their roles, and access permissions."
    >
      <UserList />
    </AdminPage>
  )
}
