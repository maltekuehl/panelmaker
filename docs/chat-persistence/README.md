# Server-Persisted AI Conversations

Status: **shipped** (Phases 1-7). Built 2026-06-26.

## What changed and why

Previously the AI chat was **entirely client-side**: conversations lived in `stores/chat.ts`
(Zustand + `localStorage`), so they were per-browser, lost on cache clear, never synced across
devices, and invisible to the server. The `ChatMessage` Prisma model only logged token-usage
telemetry, not content. The full-screen `/chat` page and the floating assistant were two
disconnected surfaces that did not share state.

Conversations are now **persisted server-side**, **strictly private** to their owner, and **shared
between the floating widget and the full-screen page**. The chat also moves off hardcoded
localStorage API keys toward **server-side encrypted provider credentials** (user- and lab-scoped)
and **arbitrary `provider:model` strings**.

## Data model (`prisma/schema.prisma`)

- `ChatConversation` (userId, title, model, pinned, deleted soft-delete; `@@index([userId, deleted, updatedAt])`).
- `ChatConversationMessage` (conversationId, `role` = `ChatMessageRole` enum, `content` = full
  `JSON.stringify(UIMessage)` so tool-call/reasoning parts survive reload, model, input/output tokens).
- `ApiCredential` (scope USER|LAB, userId/labId, provider, `ciphertext` AES-256-GCM, `last4` for
  masked display; unique on `(userId, provider)` and `(labId, provider)`).
- The old `ChatMessage` telemetry table is unchanged (admin stats still read it).

Migration: `prisma/migrations/20260625221534_chat_persistence` (additive only).

## Data + infra layers

- `models/chat/` — `queries.ts` (`server-only`: conversation CRUD, message persistence, title
  hook, `deleteMessageAndAfter`, and the `ApiCredential` CRUD + `resolveProviderKey`),
  `transforms.ts` (pure: `deriveRole`, `storedMessageId`, summary types), `schema.ts` (Zod,
  `chatRequestSchema` is permissive because the AI SDK transport adds its own body fields),
  `index.ts` barrel.
- `lib/crypto.ts` — AES-256-GCM `encryptSecret`/`decryptSecret`/`maskSecret`/`isEncryptionConfigured`,
  keyed from `ENCRYPTION_KEY` (added to `lib/env.ts`, optional 32+ chars).
- `lib/ai/models.ts` — `resolveLanguageModel(modelId, viewer)` parses `provider:model`, resolves the
  key (viewer credential -> lab credential -> `GEMINI_API_KEY`), and instantiates the matching
  provider. `DEFAULT_MODEL = "google:gemini-3.1-flash-lite"`, `listAvailableModels(viewer)`.

## API routes

- `POST /api/chat` — rewritten: validates the body, ownership-checks (or creates) the conversation,
  saves the latest user turn, resolves the model, streams, then in `toUIMessageStreamResponse`'s
  `onFinish` saves the assistant message + usage and generates a title on the first exchange.
- `GET/POST /api/chat/conversations`, `GET/PATCH/DELETE /api/chat/conversations/[id]`,
  `DELETE /api/chat/conversations/[id]/messages/[messageId]` (delete + everything after).
- `GET/POST /api/settings/api-keys` + `DELETE /api/settings/api-keys/[id]` (user keys, masked).
- `GET/POST /api/labs/[id]/api-keys` + `DELETE .../[credentialId]` (lab keys, ADMIN/OWNER only).

## UI

- `/chat` redirects to the most-recent (or a new) `/chat/[id]`; `/chat/[id]` is a dynamic server
  component that ownership-checks and renders `<Chat>` with server data (`notFound()` otherwise).
- `components/chat/chat.tsx` and `chat-sidebar.tsx` are server-data driven (no Zustand). Switching
  conversations is `router.push('/chat/[id]')`; new/rename/delete hit the API then `router.refresh()`.
  A model `<Select>` appears in the composer when more than one model is available.
- `components/ai-assistant-floating.tsx` loads (or creates) the user's most-recent conversation on
  open, persists through `/api/chat`, and has an "Open in full page" link. Drag/resize unchanged.
- `components/settings/api-keys-section.tsx` is reused on `/settings` (user keys) and
  `/labs/[slug]/settings` (shared lab keys).
- Removed: `stores/chat.ts`, `components/chat/model-picker.tsx`, `components/chat/chat-settings.tsx`,
  and the stale "powered by BioContextAI" line. Added an "Assistant" sidebar nav entry.

## Verification done

- `npx tsc --noEmit` clean; `eslint` + `prettier --check` clean.
- `tests/unit/chat.ts` (run via `npm run test:unit`): crypto round-trip / tamper rejection / masking,
  `deriveRole`, `storedMessageId`.
- `npm run build` passes under `cacheComponents` (every chat page reads `auth()` and is dynamic; no
  `auth()` inside a `use cache` boundary).

See `TODO.md` for follow-ups.
