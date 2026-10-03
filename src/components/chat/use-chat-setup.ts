"use client"

import { patchConversation } from "@/components/chat/conversation-api"
import { annotateModels, parseModelId, type ChatSetupData, type ModelAvailability } from "@/models/chat/keys"
import type { ProviderId } from "@/models/chat/schema"
import { useMemo, useState } from "react"

function persist(conversationId: string, data: { model?: string; labId?: string }) {
  patchConversation(conversationId, data).catch(() => undefined)
}

// Model and lab-context state for one conversation. Availability is recomputed on the client from the
// key inventory, so switching the lab context updates the picker without a round trip.
export function useChatSetup(conversationId: string, setup: ChatSetupData) {
  const [selectedModel, setSelectedModel] = useState(setup.selectedModel)
  const [labContextId, setLabContextId] = useState(setup.labContextId)

  const models: ModelAvailability[] = useMemo(
    () => annotateModels(setup.models, setup.inventory, labContextId),
    [setup.models, setup.inventory, labContextId],
  )

  const current = models.find((model) => model.id === selectedModel) ?? null
  const provider: ProviderId | null = current?.provider ?? parseModelId(selectedModel)?.provider ?? null

  const changeModel = (modelId: string) => {
    setSelectedModel(modelId)
    persist(conversationId, { model: modelId })
  }

  const changeLab = (labId: string) => {
    setLabContextId(labId)
    persist(conversationId, { labId })
  }

  return {
    models,
    inventory: setup.inventory,
    labContextId,
    selectedModel,
    current,
    provider,
    source: current?.source ?? null,
    hasAnyKey: models.some((model) => model.source),
    changeModel,
    changeLab,
  }
}

export type ChatSetupState = ReturnType<typeof useChatSetup>
