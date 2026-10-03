import "server-only"

import { getInstanceKey, getInstanceProviders } from "@/lib/ai/config"
import { decryptSecret, encryptSecret, isEncryptionConfigured, maskSecret } from "@/lib/crypto"
import { NotFoundError } from "@/lib/error-handling"
import type { Prisma } from "@/lib/generated/prisma/client"
import type { ApiCredentialScope, ApiCredentialStatus } from "@/lib/generated/prisma/enums"
import { logger } from "@/lib/monitoring"
import { prisma } from "@/lib/prisma"
import type { ViewerContext } from "@/models/lab/access"
import type { LanguageModelUsage, UIMessage } from "ai"
import {
  canManageLabCredentials,
  canUseLabCredential,
  isProviderId,
  rankKeySources,
  type KeyInventory,
  type KeySource,
  type LabKeyInventory,
} from "./keys"
import type { ProviderId } from "./schema"
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

function ownedConversationWhere(userId: string, conversationId: string): Prisma.ChatConversationWhereInput {
  return { id: conversationId, userId, deleted: false }
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
    where: ownedConversationWhere(userId, conversationId),
    select: {
      id: true,
      title: true,
      model: true,
      pinned: true,
      labId: true,
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
    labId: conversation.labId,
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
  return (await prisma.chatConversation.count({ where: ownedConversationWhere(userId, conversationId) })) > 0
}

// Ownership check and the fields the stream route needs (the persisted model and the title trigger)
// in a single query.
export async function getOwnedConversation(
  userId: string,
  conversationId: string,
): Promise<{ id: string; title: string | null; model: string | null; labId: string | null } | null> {
  return prisma.chatConversation.findFirst({
    where: ownedConversationWhere(userId, conversationId),
    select: { id: true, title: true, model: true, labId: true },
  })
}

export async function createConversation(userId: string, opts?: { title?: string; model?: string }) {
  const conversation = await prisma.chatConversation.create({
    data: { userId, title: opts?.title ?? null, model: opts?.model ?? null },
    select: { id: true, title: true, model: true, pinned: true, labId: true, createdAt: true, updatedAt: true },
  })
  return { ...toConversationSummary(conversation, 0), labId: conversation.labId }
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
  data: { title?: string; model?: string; pinned?: boolean; labId?: string | null },
): Promise<void> {
  await prisma.chatConversation.updateMany({ where: ownedConversationWhere(userId, conversationId), data })
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
  status: ApiCredentialStatus
  checkedAt: Date | null
  updatedAt: Date
}

interface UpsertCredentialInput {
  provider: ProviderId
  apiKey: string
  label?: string
  status: ApiCredentialStatus
}

const credentialSelect = {
  id: true,
  scope: true,
  provider: true,
  label: true,
  last4: true,
  labId: true,
  status: true,
  checkedAt: true,
  updatedAt: true,
} as const

function listCredentials(where: Prisma.ApiCredentialWhereInput): Promise<CredentialView[]> {
  return prisma.apiCredential.findMany({ where, select: credentialSelect, orderBy: { provider: "asc" } })
}

export async function getUserApiCredentials(userId: string): Promise<CredentialView[]> {
  return listCredentials({ scope: "USER", userId })
}

export async function getLabApiCredentials(labId: string): Promise<CredentialView[]> {
  return listCredentials({ scope: "LAB", labId })
}

function credentialData(input: UpsertCredentialInput) {
  return {
    ciphertext: encryptSecret(input.apiKey),
    last4: maskSecret(input.apiKey),
    label: input.label ?? null,
    status: input.status,
    checkedAt: input.status === "UNVERIFIED" ? null : new Date(),
  }
}

export async function upsertUserApiCredential(userId: string, input: UpsertCredentialInput): Promise<void> {
  const data = credentialData(input)
  await prisma.apiCredential.upsert({
    where: { userId_provider: { userId, provider: input.provider } },
    create: { scope: "USER", userId, createdById: userId, provider: input.provider, ...data },
    update: data,
  })
}

export async function upsertLabApiCredential(
  labId: string,
  createdById: string,
  input: UpsertCredentialInput,
): Promise<void> {
  const data = credentialData(input)
  await prisma.apiCredential.upsert({
    where: { labId_provider: { labId, provider: input.provider } },
    create: { scope: "LAB", labId, createdById, provider: input.provider, ...data },
    update: { ...data, createdById },
  })
}

async function deleteCredential(where: Prisma.ApiCredentialWhereInput): Promise<void> {
  const { count } = await prisma.apiCredential.deleteMany({ where })
  if (count === 0) throw new NotFoundError("API key not found")
}

export async function deleteUserApiCredential(userId: string, credentialId: string): Promise<void> {
  await deleteCredential({ id: credentialId, userId, scope: "USER" })
}

export async function deleteLabApiCredential(labId: string, credentialId: string): Promise<void> {
  await deleteCredential({ id: credentialId, labId, scope: "LAB" })
}

export type StoredSecret = { provider: ProviderId; key: string } | { provider: ProviderId; key: null }

async function readStoredSecret(where: Prisma.ApiCredentialWhereInput): Promise<StoredSecret | null> {
  const row = await prisma.apiCredential.findFirst({ where, select: { provider: true, ciphertext: true } })
  if (!row || !isProviderId(row.provider)) return null
  return { provider: row.provider, key: safeDecrypt(row.ciphertext) ?? null }
}

export async function getUserCredentialSecret(userId: string, credentialId: string): Promise<StoredSecret | null> {
  return readStoredSecret({ id: credentialId, userId, scope: "USER" })
}

export async function getLabCredentialSecret(labId: string, credentialId: string): Promise<StoredSecret | null> {
  return readStoredSecret({ id: credentialId, labId, scope: "LAB" })
}

export async function setCredentialStatus(credentialId: string, status: ApiCredentialStatus): Promise<void> {
  await prisma.apiCredential.updateMany({
    where: { id: credentialId },
    data: { status, checkedAt: new Date() },
  })
}

function safeDecrypt(blob: string): string | undefined {
  try {
    return decryptSecret(blob)
  } catch {
    return undefined
  }
}

// Which providers the viewer can reach at each level, in two queries. Stored keys only count when the
// server can decrypt them at all (ENCRYPTION_KEY set); lab entries are limited to the viewer's labs.
export async function getKeyInventory(viewer: ViewerContext | null): Promise<KeyInventory> {
  const instance = getInstanceProviders()
  if (!viewer) return { user: [], labs: [], instance }

  const canDecrypt = isEncryptionConfigured()
  const [credentials, labs] = await Promise.all([
    canDecrypt
      ? prisma.apiCredential.findMany({
          where: {
            OR: [
              { scope: "USER", userId: viewer.userId },
              { scope: "LAB", labId: { in: viewer.labIds } },
            ],
          },
          select: { scope: true, labId: true, provider: true },
        })
      : Promise.resolve([]),
    viewer.labIds.length > 0
      ? prisma.lab.findMany({ where: { id: { in: viewer.labIds } }, select: { id: true, name: true, slug: true } })
      : Promise.resolve([]),
  ])

  const user: ProviderId[] = []
  const labProviders = new Map<string, ProviderId[]>()
  for (const credential of credentials) {
    if (!isProviderId(credential.provider)) continue
    if (credential.scope === "USER") user.push(credential.provider)
    else if (credential.labId && canUseLabCredential(viewer, credential.labId)) {
      labProviders.set(credential.labId, [...(labProviders.get(credential.labId) ?? []), credential.provider])
    }
  }

  const labById = new Map(labs.map((lab) => [lab.id, lab]))
  const labEntries: LabKeyInventory[] = viewer.labIds.flatMap((labId) => {
    const lab = labById.get(labId)
    if (!lab) return []
    return [
      {
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        canManage: canManageLabCredentials(viewer, lab.id),
        providers: labProviders.get(lab.id) ?? [],
      },
    ]
  })

  return { user, labs: labEntries, instance }
}

export interface ResolvedProviderKey {
  key: string
  source: KeySource
  credentialId: string | null
}

export type ProviderKeyResult =
  | { ok: true; resolved: ResolvedProviderKey }
  | { ok: false; code: "NO_KEY_CONFIGURED" | "KEY_UNREADABLE" }

// Walk the ranked sources (user, then the chat's lab, then instance) and return the first key that
// decrypts. A stored key that no longer decrypts is skipped, and reported only when nothing else works.
export async function resolveProviderKey(
  provider: ProviderId,
  viewer: ViewerContext | null,
  labContextId: string | null,
): Promise<ProviderKeyResult> {
  const inventory = await getKeyInventory(viewer)
  let unreadable = false
  for (const source of rankKeySources(provider, inventory, labContextId)) {
    if (source.kind === "instance") {
      const key = getInstanceKey(provider)
      if (key) return { ok: true, resolved: { key, source, credentialId: null } }
      continue
    }
    const where: Prisma.ApiCredentialWhereInput =
      source.kind === "user"
        ? { scope: "USER", userId: viewer?.userId, provider }
        : { scope: "LAB", labId: source.labId, provider }
    const row = await prisma.apiCredential.findFirst({ where, select: { id: true, ciphertext: true } })
    if (!row) continue
    const key = safeDecrypt(row.ciphertext)
    if (key) return { ok: true, resolved: { key, source, credentialId: row.id } }
    unreadable = true
    logger.warn("Stored API credential could not be decrypted", { credentialId: row.id, provider })
  }
  return { ok: false, code: unreadable ? "KEY_UNREADABLE" : "NO_KEY_CONFIGURED" }
}

// The model and lab context the viewer used most recently, so a new conversation starts where they
// left off on any device.
export async function getLastChatSettings(userId: string): Promise<{ model: string | null; labId: string | null }> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { userId, deleted: false, model: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { model: true, labId: true },
  })
  return { model: conversation?.model ?? null, labId: conversation?.labId ?? null }
}
