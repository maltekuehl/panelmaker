import { SignInRequired } from "@/components/shared/sign-in-required"
import { getSessionUser } from "@/lib/auth"
import { createConversation, getMostRecentConversationId } from "@/models/chat"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Chat | PanelMaker",
  description:
    "PanelMaker's AI assistant for spatial proteomics panel design. Get help with antibody selection, marker compatibility, and panel optimization through natural conversation.",
  keywords: [
    "PanelMaker chat",
    "spatial proteomics AI",
    "antibody panel design",
    "AI assistant",
    "biomedical AI",
    "panel optimization",
    "marker selection",
  ],
  openGraph: {
    title: "Chat | PanelMaker",
    description: "AI assistant for spatial proteomics antibody panel design and optimization",
    type: "website",
  },
}

export default async function ChatHome() {
  const user = await getSessionUser()

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <SignInRequired
          title="Sign in to use the assistant"
          description="The PanelMaker assistant suggests markers, checks antibody compatibility across cycles, and edits your panels as you talk to it. Your conversations are saved to your account."
          callbackPath="/chat"
        />
      </div>
    )
  }

  const existingId = await getMostRecentConversationId(user.id)
  const id = existingId ?? (await createConversation(user.id)).id
  redirect(`/chat/${id}`)
}
