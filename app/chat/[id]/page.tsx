import Chat from "@/components/chat/chat"
import { DEFAULT_MODEL, listAvailableModels } from "@/lib/ai/models"
import { getSessionUser, resolveViewerContext } from "@/lib/auth"
import { getConversation, getConversationsForUser } from "@/models/chat"
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

  const [conversation, conversations, availableModels] = await Promise.all([
    getConversation(user.id, id),
    getConversationsForUser(user.id),
    resolveViewerContext(user.id).then(listAvailableModels),
  ])

  if (!conversation) {
    notFound()
  }

  return (
    <Chat
      key={conversation.id}
      conversationId={conversation.id}
      initialMessages={conversation.messages}
      conversations={conversations}
      name={user.name ?? undefined}
      availableModels={availableModels.map((model) => ({ id: model.id, label: model.label }))}
      currentModel={conversation.model ?? DEFAULT_MODEL}
    />
  )
}
