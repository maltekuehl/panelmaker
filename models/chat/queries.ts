import "server-only"

import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto"
import { env } from "@/lib/env"
import type { ApiCredentialScope } from "@/lib/generated/prisma/enums"
import { logger } from "@/lib/monitoring"
import { prisma } from "@/lib/prisma"
import type { ViewerContext } from "@/models/lab/access"
import type { LanguageModelUsage, UIMessage } from "ai"
import { PROVIDER_IDS, type ProviderId } from "./schema"
import {
  deriveRole,
  parseStoredMessage,
  storedMessageId,
  toConversationSummary,
  type ConversationSummary,
  type ConversationWithMessages,
} from "./transforms"

interface UsageInfo {
  inputTokens?: number
  outputTokens?: number
}

export type KeySource = "user" | "lab" | "community"

export interface ResolvedProviderKey {
  key: string
  source: KeySource
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
  return rows.map((row) => toConversationSummary(row, row._count.messages))
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
  // Assistant rows written before the response message carried a server id have `id: ""`; give them a
  // stable positional id so React keys stay unique (they remain non-deletable, as they always were).
  const messages = conversation.messages
    .map((message, index) => {
      const parsed = parseStoredMessage(message.content)
      if (!parsed) return null
      return parsed.id ? parsed : { ...parsed, id: `legacy-${index}` }
    })
    .filter((message): message is UIMessage => message !== null)
  if (messages.length !== conversation.messages.length) {
    logger.warn("Skipped unreadable chat messages", {
      conversationId,
      skipped: conversation.messages.length - messages.length,
    })
  }
  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    pinned: conversation.pinned,
    messages,
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

// Ownership check and the fields the stream route needs (the persisted model and the title trigger)
// in a single query.
export async function getOwnedConversation(
  userId: string,
  conversationId: string,
): Promise<{ id: string; title: string | null; model: string | null } | null> {
  return prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, deleted: false },
    select: { id: true, title: true, model: true },
  })
}

export async function createConversation(userId: string, opts?: { title?: string; model?: string }) {
  const conversation = await prisma.chatConversation.create({
    data: { userId, title: opts?.title ?? null, model: opts?.model ?? null },
    select: { id: true, title: true, model: true, pinned: true, createdAt: true, updatedAt: true },
  })
  return toConversationSummary(conversation, 0)
}

export async function countMessages(conversationId: string): Promise<number> {
  return prisma.chatConversationMessage.count({ where: { conversationId } })
}

// The single append path: every stored message goes through here so a new per-message column only
// ever has to be written in one place.
export async function appendMessages(
  conversationId: string,
  messages: UIMessage[],
  meta?: { model: string; usage: UsageInfo },
): Promise<void> {
  if (messages.length === 0) return
  await prisma.$transaction([
    ...messages.map((message) =>
      prisma.chatConversationMessage.create({
        data: {
          conversationId,
          role: deriveRole(message),
          content: JSON.stringify(message),
          model: meta?.model ?? null,
          inputTokens: meta?.usage.inputTokens ?? null,
          outputTokens: meta?.usage.outputTokens ?? null,
        },
      }),
    ),
    prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])
}

export async function saveUserMessage(conversationId: string, message: UIMessage): Promise<void> {
  await appendMessages(conversationId, [message])
}

export async function saveAssistantMessages(
  conversationId: string,
  messages: UIMessage[],
  usage: UsageInfo,
  model: string,
): Promise<void> {
  await appendMessages(conversationId, messages, { model, usage })
}

// Per-request token telemetry, kept separate from the conversation transcript so the admin stats
// query has a single flat table to group on.
export async function logChatUsage(userId: string, usage: LanguageModelUsage, model: string): Promise<void> {
  try {
    await prisma.chatMessage.create({
      data: {
        userId,
        modelName: model,
        inputTokens: usage.inputTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
        reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
        cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
      },
    })
  } catch (error) {
    logger.error("Failed to log chat usage", error instanceof Error ? error : new Error(String(error)))
  }
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

// The UI promises "this cannot be undone", so the row really goes (messages cascade with it).
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  await prisma.chatConversation.deleteMany({ where: { id: conversationId, userId } })
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

// Resolve a decrypted provider key. Precedence: the viewer's own credential, then their labs' shared
// credentials (oldest first, so the choice is stable for multi-lab members), then the community env
// key (Google only). The source lets the caller charge the free-tier quota to community use only.
export async function resolveProviderKey(
  provider: string,
  viewer: ViewerContext | null,
): Promise<ResolvedProviderKey | undefined> {
  if (viewer?.userId) {
    const userCredential = await prisma.apiCredential.findFirst({
      where: { scope: "USER", userId: viewer.userId, provider },
      select: { ciphertext: true },
    })
    if (userCredential) {
      const key = safeDecrypt(userCredential.ciphertext)
      if (key) return { key, source: "user" }
    }
    if (viewer.labIds.length > 0) {
      const labCredential = await prisma.apiCredential.findFirst({
        where: { scope: "LAB", labId: { in: viewer.labIds }, provider },
        orderBy: { createdAt: "asc" },
        select: { ciphertext: true },
      })
      if (labCredential) {
        const key = safeDecrypt(labCredential.ciphertext)
        if (key) return { key, source: "lab" }
      }
    }
  }
  if (provider === "google" && env.GEMINI_API_KEY) return { key: env.GEMINI_API_KEY, source: "community" }
  return undefined
}

// Which providers the viewer could run, in one query instead of a credential lookup per provider.
// An existence check only: a stored key that no longer decrypts is reported as available and the
// stream route surfaces the clear "No API key available" error when it is actually used.
export async function listAvailableProviders(viewer: ViewerContext | null): Promise<Set<ProviderId>> {
  const available = new Set<ProviderId>()
  if (env.GEMINI_API_KEY) available.add("google")
  if (!viewer?.userId) return available
  const rows = await prisma.apiCredential.findMany({
    where: {
      OR: [
        { scope: "USER", userId: viewer.userId },
        { scope: "LAB", labId: { in: viewer.labIds } },
      ],
    },
    select: { provider: true },
    distinct: ["provider"],
  })
  for (const row of rows) {
    const provider = PROVIDER_IDS.find((id) => id === row.provider)
    if (provider) available.add(provider)
  }
  return available
}
