import { DetailNotFound } from "@/components/detail/detail-not-found"
import { ShieldCheck } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Antibody Not Found | PanelMaker",
  description: "The requested antibody could not be found.",
}

export default function AntibodyNotFound() {
  return (
    <DetailNotFound
      icon={ShieldCheck}
      title="Antibody Not Found"
      description="The antibody you're looking for doesn't exist or may have been removed."
      href="/browse"
      linkLabel="Browse All Antibodies"
    />
  )
}
