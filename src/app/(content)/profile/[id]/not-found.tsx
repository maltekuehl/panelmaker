import { DetailNotFound } from "@/components/detail/detail-not-found"
import { UserRound } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile Not Found | PanelMaker",
  description: "The requested user profile could not be found.",
}

export default function ProfileNotFound() {
  return (
    <DetailNotFound
      icon={UserRound}
      title="Profile Not Found"
      description="The user profile you're looking for doesn't exist or may have been removed."
      href="/leaderboard"
      linkLabel="View Community Leaderboard"
    />
  )
}
