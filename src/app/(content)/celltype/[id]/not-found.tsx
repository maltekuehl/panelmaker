import { DetailNotFound } from "@/components/detail/detail-not-found"
import { Users } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cell Type Not Found | PanelMaker",
  description: "The requested cell type could not be found.",
}

export default function CellTypeNotFound() {
  return (
    <DetailNotFound
      icon={Users}
      title="Cell Type Not Found"
      description="The cell type you're looking for doesn't exist or may have been removed."
      href="/browse?mode=markers"
      linkLabel="Browse All Markers"
    />
  )
}
