import { DetailNotFound } from "@/components/detail/detail-not-found"
import { Microscope } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Marker Not Found | PanelMaker",
  description: "The requested marker could not be found.",
}

export default function MarkerNotFound() {
  return (
    <DetailNotFound
      icon={Microscope}
      title="Marker Not Found"
      description="The marker you're looking for doesn't exist or may have been removed."
      href="/browse?mode=markers"
      linkLabel="Browse All Markers"
    />
  )
}
