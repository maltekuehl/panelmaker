import "server-only"

import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto"
import type { ApiCredentialScope } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import type { ViewerContext } from "@/models/lab/access"
import type { UIMessage } from "ai"
import { deriveRole, storedMessageId, type ConversationSummary, type ConversationWithMessages } from "./transforms"

interface UsageInfo {
  inputTokens?: number
  outputTokens?: number
}

export async function getConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  const rows = await prisma.chatConversation.findMany({
    where: { userId, deleted: false },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      model: true,
      pinned: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    pinned: row.pinned,
    messageCount: row._count.messages,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationWithMessages | null> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, deleted: false },
    select: {
      id: true,
      title: true,
      model: true,
      pinned: true,
      messages: { orderBy: { createdAt: "asc" }, select: { content: true } },
    },
  })
  if (!conversation) return null
  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    pinned: conversation.pinned,
    messages: conversation.messages.map((message) => JSON.parse(message.content) as UIMessage),
  }
}

export async function getMostRecentConversationId(userId: string): Promise<string | null> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { userId, deleted: false },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  })
  return conversation?.id ?? null
}

export async function conversationBelongsToUser(userId: string, conversationId: string): Promise<boolean> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, deleted: false },
    select: { id: true },
  })
  return Boolean(conversation)
}

export async function createConversation(userId: string, opts?: { title?: string; model?: string }) {
  const conversation = await prisma.chatConversation.create({
    data: { userId, title: opts?.title ?? null, model: opts?.model ?? null },
    select: { id: true, title: true, model: true, pinned: true, createdAt: true, updatedAt: true },
  })
  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    pinned: conversation.pinned,
    messageCount: 0,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  } satisfies ConversationSummary
}

export async function countMessages(conversationId: string): Promise<number> {
  return prisma.chatConversationMessage.count({ where: { conversationId } })
}

export async function saveUserMessage(conversationId: string, message: UIMessage): Promise<void> {
  await prisma.$transaction([
    prisma.chatConversationMessage.create({
      data: { conversationId, role: deriveRole(message), content: JSON.stringify(message) },
    }),
    prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])
}

export async function saveAssistantMessages(
  conversationId: string,
  messages: UIMessage[],
  usage: UsageInfo,
  model: string,
): Promise<void> {
  if (messages.length === 0) return
  await prisma.$transaction([
    ...messages.map((message) =>
      prisma.chatConversationMessage.create({
        data: {
          conversationId,
          role: deriveRole(message),
          content: JSON.stringify(message),
          model,
          inputTokens: usage.inputTokens ?? null,
          outputTokens: usage.outputTokens ?? null,
        },
      }),
    ),
    prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])
}

export async function setConversationTitle(conversationId: string, title: string): Promise<void> {
  await prisma.chatConversation.update({ where: { id: conversationId }, data: { title } })
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  data: { title?: string; model?: string; pinned?: boolean },
): Promise<void> {
  await prisma.chatConversation.updateMany({ where: { id: conversationId, userId, deleted: false }, data })
}

export async function softDeleteConversation(userId: string, conversationId: string): Promise<void> {
  await prisma.chatConversation.updateMany({ where: { id: conversationId, userId }, data: { deleted: true } })
}

export async function deleteAllConversationsForUser(userId: string): Promise<void> {
  await prisma.chatConversation.updateMany({ where: { userId, deleted: false }, data: { deleted: true } })
}

// Delete the message with the given UIMessage id (stored inside the content JSON) and every message
// after it. Powers single-message delete and edit-and-regenerate from the message id the client holds.
export async function deleteMessageAndAfter(userId: string, conversationId: string, messageUid: string): Promise<void> {
  const owns = await conversationBelongsToUser(userId, conversationId)
  if (!owns) return
  const rows = await prisma.chatConversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true },
  })
  const index = rows.findIndex((row) => storedMessageId(row.content) === messageUid)
  if (index === -1) return
  const idsToDelete = rows.slice(index).map((row) => row.id)
  await prisma.chatConversationMessage.deleteMany({ where: { id: { in: idsToDelete } } })
}

// ─── API credentials (encrypted at rest) ──────────────────────────────

export interface CredentialView {
  id: string
  scope: ApiCredentialScope
  provider: string
  label: string | null
  last4: string | null
  labId: string | null
}

interface UpsertCredentialInput {
  provider: string
  apiKey: string
  label?: string
}

const credentialSelect = {
  id: true,
  scope: true,
  provider: true,
  label: true,
  last4: true,
  labId: true,
} as const

export async function getUserApiCredentials(userId: string): Promise<CredentialView[]> {
  return prisma.apiCredential.findMany({
    where: { scope: "USER", userId },
    select: credentialSelect,
    orderBy: { provider: "asc" },
  })
}

export async function getLabApiCredentials(labId: string): Promise<CredentialView[]> {
  return prisma.apiCredential.findMany({
    where: { scope: "LAB", labId },
    select: credentialSelect,
    orderBy: { provider: "asc" },
  })
}

export async function upsertUserApiCredential(userId: string, input: UpsertCredentialInput): Promise<void> {
  const ciphertext = encryptSecret(input.apiKey)
  const last4 = maskSecret(input.apiKey)
  await prisma.apiCredential.upsert({
    where: { userId_provider: { userId, provider: input.provider } },
    create: { scope: "USER", userId, provider: input.provider, label: input.label ?? null, ciphertext, last4 },
    update: { ciphertext, last4, label: input.label ?? null },
  })
}

export async function upsertLabApiCredential(
  labId: string,
  createdById: string,
  input: UpsertCredentialInput,
): Promise<void> {
  const ciphertext = encryptSecret(input.apiKey)
  const last4 = maskSecret(input.apiKey)
  await prisma.apiCredential.upsert({
    where: { labId_provider: { labId, provider: input.provider } },
    create: {
      scope: "LAB",
      labId,
      createdById,
      provider: input.provider,
      label: input.label ?? null,
      ciphertext,
      last4,
    },
    update: { ciphertext, last4, label: input.label ?? null },
  })
}

export async function deleteUserApiCredential(userId: string, credentialId: string): Promise<void> {
  await prisma.apiCredential.deleteMany({ where: { id: credentialId, userId, scope: "USER" } })
}

export async function deleteLabApiCredential(labId: string, credentialId: string): Promise<void> {
  await prisma.apiCredential.deleteMany({ where: { id: credentialId, labId, scope: "LAB" } })
}

function safeDecrypt(blob: string): string | undefined {
  try {
    return decryptSecret(blob)
  } catch {
    return undefined
  }
}

// Resolve a decrypted provider key. Precedence: the viewer's own credential, then any of their labs'
// shared credentials, then the community env key (Google only). Returns undefined when none exists.
export async function resolveProviderKey(provider: string, viewer: ViewerContext | null): Promise<string | undefined> {
  if (viewer?.userId) {
    const userCredential = await prisma.apiCredential.findFirst({
      where: { scope: "USER", userId: viewer.userId, provider },
      select: { ciphertext: true },
    })
    if (userCredential) {
      const key = safeDecrypt(userCredential.ciphertext)
      if (key) return key
    }
    if (viewer.labIds.length > 0) {
      const labCredential = await prisma.apiCredential.findFirst({
        where: { scope: "LAB", labId: { in: viewer.labIds }, provider },
        select: { ciphertext: true },
      })
      if (labCredential) {
        const key = safeDecrypt(labCredential.ciphertext)
        if (key) return key
      }
    }
  }
  if (provider === "google") return process.env.GEMINI_API_KEY
  return undefined
}
