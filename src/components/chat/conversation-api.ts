"use client"

const CONVERSATIONS_URL = "/api/chat/conversations"

export function conversationUrl(id: string): string {
  return `${CONVERSATIONS_URL}/${id}`
}

export async function createConversation(): Promise<string | undefined> {
  const response = await fetch(CONVERSATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
  if (!response.ok) return undefined
  const json = await response.json()
  return json?.conversation?.id as string | undefined
}

export async function patchConversation(id: string, data: Record<string, string>): Promise<Response> {
  return fetch(conversationUrl(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export function deleteMessagesFrom(conversationId: string, messageId: string): Promise<Response> {
  return fetch(`${conversationUrl(conversationId)}/messages/${messageId}`, { method: "DELETE" })
}
