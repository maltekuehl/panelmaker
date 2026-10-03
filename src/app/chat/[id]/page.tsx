import Chat from "@/components/chat/chat"
import { getChatSetup } from "@/lib/ai/models"
import { getSessionUser, resolveViewerContext } from "@/lib/auth"
import { getConversation, getConversationsForUser, getLastChatSettings, resolveLabContext } from "@/models/chat"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Chat | PanelMaker",
  description:
    "PanelMaker's AI assistant for spatial proteomics panel design. Get help with antibody selection, marker compatibility, and panel optimization through natural conversation.",
  robots: { index: false, follow: false },
}

type Props = { params: Promise<{ id: string }> }

export default async function ChatConversationPage({ params }: Props) {
  const { id } = await params
  const user = await getSessionUser()

  if (!user) {
    redirect("/chat")
  }

  const [conversation, conversations, viewer, last] = await Promise.all([
    getConversation(user.id, id),
    getConversationsForUser(user.id),
    resolveViewerContext(user.id),
    getLastChatSettings(user.id),
  ])

  if (!conversation) {
    notFound()
  }

  const labContext = resolveLabContext(viewer, null, conversation.labId ?? last.labId)
  const chatSetup = await getChatSetup(viewer, {
    labContextId: labContext.ok ? labContext.labId : null,
    preferredModels: [conversation.model, last.model],
  })

  return (
    <Chat
      key={conversation.id}
      conversationId={conversation.id}
      initialMessages={conversation.messages}
      conversations={conversations}
      name={user.name ?? undefined}
      chatSetup={chatSetup}
    />
  )
}
