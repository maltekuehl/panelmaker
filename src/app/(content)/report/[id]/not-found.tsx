import { DetailNotFound } from "@/components/detail/detail-not-found"
import { FileX } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Report Not Found | PanelMaker",
  description: "The requested experimental report could not be found.",
}

export default function ReportNotFound() {
  return (
    <DetailNotFound
      icon={FileX}
      title="Report Not Found"
      description="The experimental report you're looking for doesn't exist or may have been removed."
      href="/browse?mode=reports"
      linkLabel="Browse All Reports"
    />
  )
}
