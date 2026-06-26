import { auth } from "@/auth"
import ChatSignInRequired from "@/components/chat/chat-signin-required"
import { createConversation, getMostRecentConversationId } from "@/models/chat"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Chat | PanelMaker",
  description:
    "PanelMaker&apos;s AI assistant for spatial proteomics panel design. Get help with antibody selection, marker compatibility, and panel optimization through natural conversation.",
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
  const session = await auth()

  if (!session?.user?.id) {
    return <ChatSignInRequired />
  }

  const existingId = await getMostRecentConversationId(session.user.id)
  const id = existingId ?? (await createConversation(session.user.id)).id
  redirect(`/chat/${id}`)
}
