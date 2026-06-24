"use client"

import type { UIMessage } from "ai"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export interface Conversation {
  id: string
  title: string
  createdAt: string
  messages: UIMessage[]
}

export interface ChatSettings {
  selectedModel: string
  googleApiKey: string | null
  openaiApiKey: string | null
  anthropicApiKey: string | null
  groqApiKey: string | null
  conversations: Conversation[]
  currentConversationId: string | null
}

export interface ChatActions {
  setSelectedModel: (modelId: string) => void
  setGoogleApiKey: (key: string | null) => void
  setOpenaiApiKey: (key: string | null) => void
  setAnthropicApiKey: (key: string | null) => void
  setGroqApiKey: (key: string | null) => void
  getApiKeyForModel: (modelId: string) => string | null
  setApiKeyForProvider: (provider: "google" | "openai" | "anthropic" | "groq", key: string | null) => void

  createConversation: () => string
  deleteConversation: (conversationId: string) => void
  setCurrentConversation: (conversationId: string) => void
  updateConversationTitle: (conversationId: string, title: string) => void
  getCurrentConversation: () => Conversation | null

  addMessage: (message: UIMessage) => void
  setMessages: (messages: UIMessage[]) => void
  updateMessage: (messageId: string, updates: Partial<UIMessage>) => void
  deleteMessage: (messageId: string) => void
  clearMessages: () => void

  resetAllSettings: () => void
}

export type ChatStore = ChatSettings & ChatActions

const DEFAULT_MODEL = "gemini-3.5-flash"

const formatDateForTitle = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const createNewConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: formatDateForTitle(new Date()),
  createdAt: new Date().toISOString(),
  messages: [],
})

const initialState: ChatSettings = {
  selectedModel: DEFAULT_MODEL,
  googleApiKey: null,
  openaiApiKey: null,
  anthropicApiKey: null,
  groqApiKey: null,
  conversations: [createNewConversation()],
  currentConversationId: null,
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedModel: (modelId) => set(() => ({ selectedModel: modelId })),

      setGoogleApiKey: (key) => set(() => ({ googleApiKey: key })),
      setOpenaiApiKey: (key) => set(() => ({ openaiApiKey: key })),
      setAnthropicApiKey: (key) => set(() => ({ anthropicApiKey: key })),
      setGroqApiKey: (key) => set(() => ({ groqApiKey: key })),

      setApiKeyForProvider: (provider, key) =>
        set(() => {
          if (provider === "google") return { googleApiKey: key }
          if (provider === "openai") return { openaiApiKey: key }
          if (provider === "groq") return { groqApiKey: key }
          return { anthropicApiKey: key }
        }),

      getApiKeyForModel: (modelId) => {
        const state = get()
        if (modelId.startsWith("groq-")) return state.groqApiKey
        if (modelId.startsWith("gpt-")) return state.openaiApiKey
        if (modelId.startsWith("claude-")) return state.anthropicApiKey
        return state.googleApiKey
      },

      createConversation: () => {
        const newConversation = createNewConversation()
        set((state) => ({
          conversations: [...state.conversations, newConversation],
          currentConversationId: newConversation.id,
        }))
        return newConversation.id
      },

      deleteConversation: (conversationId) =>
        set((state) => {
          const filteredConversations = state.conversations.filter((c) => c.id !== conversationId)

          let newCurrentId = state.currentConversationId
          if (state.currentConversationId === conversationId) {
            if (filteredConversations.length > 0) {
              newCurrentId = filteredConversations[0].id
            } else {
              const newConversation = createNewConversation()
              filteredConversations.push(newConversation)
              newCurrentId = newConversation.id
            }
          }

          return {
            conversations: filteredConversations,
            currentConversationId: newCurrentId,
          }
        }),

      setCurrentConversation: (conversationId) => set(() => ({ currentConversationId: conversationId })),

      updateConversationTitle: (conversationId, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, title } : c)),
        })),

      getCurrentConversation: () => {
        const state = get()
        const currentId = state.currentConversationId || state.conversations[0]?.id
        return state.conversations.find((c) => c.id === currentId) || null
      },

      addMessage: (message) =>
        set((state) => {
          const currentId = state.currentConversationId || state.conversations[0]?.id
          if (!currentId) return state
          return {
            conversations: state.conversations.map((c) =>
              c.id === currentId ? { ...c, messages: [...c.messages, message] } : c,
            ),
          }
        }),

      setMessages: (messages) =>
        set((state) => {
          const currentId = state.currentConversationId || state.conversations[0]?.id
          if (!currentId) return state
          const currentConversation = state.conversations.find((c) => c.id === currentId)
          if (!currentConversation) return state
          return {
            conversations: state.conversations.map((c) => (c.id === currentId ? { ...c, messages } : c)),
          }
        }),

      updateMessage: (messageId, updates) =>
        set((state) => {
          const currentId = state.currentConversationId || state.conversations[0]?.id
          if (!currentId) return state
          return {
            conversations: state.conversations.map((c) =>
              c.id === currentId
                ? { ...c, messages: c.messages.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)) }
                : c,
            ),
          }
        }),

      deleteMessage: (messageId) =>
        set((state) => {
          const currentId = state.currentConversationId || state.conversations[0]?.id
          if (!currentId) return state
          return {
            conversations: state.conversations.map((c) =>
              c.id === currentId ? { ...c, messages: c.messages.filter((msg) => msg.id !== messageId) } : c,
            ),
          }
        }),

      clearMessages: () =>
        set((state) => {
          const currentId = state.currentConversationId || state.conversations[0]?.id
          if (!currentId) return state
          return {
            conversations: state.conversations.map((c) => (c.id === currentId ? { ...c, messages: [] } : c)),
          }
        }),

      resetAllSettings: () => {
        const newConversation = createNewConversation()
        set(() => ({
          selectedModel: DEFAULT_MODEL,
          googleApiKey: null,
          openaiApiKey: null,
          anthropicApiKey: null,
          groqApiKey: null,
          conversations: [newConversation],
          currentConversationId: newConversation.id,
        }))
      },
    }),
    {
      name: "panelmaker-chat-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        googleApiKey: state.googleApiKey,
        openaiApiKey: state.openaiApiKey,
        anthropicApiKey: state.anthropicApiKey,
        groqApiKey: state.groqApiKey,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
      version: 6,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 6) {
          const oldState = persistedState as Record<string, unknown>
          const newConversation = createNewConversation()
          return {
            selectedModel: (oldState.selectedModel as string) || DEFAULT_MODEL,
            googleApiKey: (oldState.googleApiKey as string | null) || null,
            openaiApiKey: (oldState.openaiApiKey as string | null) || null,
            anthropicApiKey: (oldState.anthropicApiKey as string | null) || null,
            groqApiKey: (oldState.groqApiKey as string | null) || null,
            conversations: (oldState.conversations as Conversation[]) || [newConversation],
            currentConversationId: (oldState.currentConversationId as string | null) || null,
          }
        }
        return persistedState
      },
    },
  ),
)
