import "server-only"

import { prisma } from "@/lib/prisma"

interface UsageInfo {
  inputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

export async function logChatMessage(
  userId: string | undefined,
  _steps: unknown[],
  totalUsage: UsageInfo,
  _toolToServerUrl: Map<string, string>,
  modelName?: string,
): Promise<void> {
  try {
    await prisma.chatMessage.create({
      data: {
        userId: userId || null,
        modelName: modelName || null,
        inputTokens: totalUsage.inputTokens || 0,
        totalTokens: totalUsage.totalTokens || 0,
        reasoningTokens: totalUsage.reasoningTokens || 0,
        cachedInputTokens: totalUsage.cachedInputTokens || 0,
      },
    })
  } catch (error) {
    console.error("Failed to log chat message:", error)
  }
}
