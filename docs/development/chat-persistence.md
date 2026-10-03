# Server-Persisted AI Conversations

Design notes for developers. Operators should read [the AI assistant operator guide](../self-hosting/ai-assistant.md) instead.

Status: **shipped** (Phases 1-7). Built 2026-06-26. Key model reworked 2026-09-30 (no free shared key).

## What changed and why

Previously the AI chat was **entirely client-side**: conversations lived in `src/stores/chat.ts`
(Zustand + `localStorage`), so they were per-browser, lost on cache clear, never synced across
devices, and invisible to the server. The `ChatMessage` Prisma model only logged token-usage
telemetry, not content. The full-screen `/chat` page and the floating assistant were two
disconnected surfaces that did not share state.

Conversations are now **persisted server-side**, **strictly private** to their owner, and **shared
between the floating widget and the full-screen page**. The chat also moves off hardcoded
localStorage API keys toward **server-side encrypted provider credentials** (user- and lab-scoped)
and **arbitrary `provider:model` strings**.

## API keys: who pays for a chat turn

There is no free or shared community key. Every chat turn runs on a key someone explicitly configured,
at one of three levels. For the provider of the selected model, the first available key wins:

1. **User key**: stored by the user in `/settings#ai-keys`. Only ever used for that user's chats.
2. **Lab key**: stored by a lab ADMIN or OWNER in `/labs/[slug]/settings#ai-keys`. Used only for the lab
   the conversation acts in (`ChatConversation.labId`), and only while the viewer is a member of that
   lab (membership is re-read on every request through `resolveViewerContext`).
3. **Instance key**: `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` set by the
   operator.

Lab context: an explicitly requested `labId` must be one of the viewer's labs (403 `LAB_ACCESS_DENIED`
otherwise); a stored lab the viewer has left is dropped silently; the default is the viewer's first lab
by join date. Users in several labs switch it from the model picker ("Use lab keys from").

A stored key that no longer decrypts (for example after `ENCRYPTION_KEY` changed) is skipped and the next
source is tried; if nothing works the error is `KEY_UNREADABLE`. When `ENCRYPTION_KEY` is unset, stored
keys are ignored entirely and only instance keys can be used.

The chat shows the source next to the model ("Using your key", "Using Puelles Lab key", "Using the
instance key"). Models without any key are disabled in the picker with "No key", and the composer shows
what is missing and where to fix it (own settings, the lab settings for lab admins, otherwise ask a lab
admin or the operator).

### Model choice

The picker groups the catalog by provider. The selected model is persisted on the conversation. A new
conversation starts with the model and lab of the user's most recently updated conversation, else
`AI_DEFAULT_MODEL`, else `google:gemini-3.5-flash-lite`; if that model has no key, the first runnable
model is chosen instead.

### Model calls and reasoning effort

The route runs on the AI SDK v7 (`ai` 7, `@ai-sdk/react` 4, `@ai-sdk/google`/`openai`/`anthropic` 4, all
on the v4 provider spec, so no "compatibility mode" warning). `streamText` gets `instructions` (the
system prompt), `allowSystemInMessages: false`, `stopWhen: isStepCount(15)`, `temperature: 0.2`,
`seed`, `maxOutputTokens: 10000` and the provider-agnostic `reasoning` option; there are no
provider-specific `providerOptions`. The response goes through `toUIMessageStream` plus
`createUIMessageStreamResponse` with `sendReasoning: true`, and usage is logged from `onEnd`'s `usage`
(all steps).

Reasoning effort is chosen in the composer next to the model (`ReasoningPicker`, Minimal / Low / Medium /
High, default Low). It is a per-browser preference in `localStorage` shared with the floating widget,
sent as `reasoning` in the request body and validated against `REASONING_EFFORTS` in
`src/models/chat/schema.ts`. How the SDK maps it:

| Effort                    | Google Gemini 3.x                                                                   | OpenAI (Responses)                                               | Anthropic                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `none` (Minimal)          | lowest `thinkingLevel` the model accepts (`low` on 3.7+ Flash, `minimal` otherwise) | `reasoningEffort: none`                                          | thinking off (or `between_tools` / effort `low` where the model cannot disable it) |
| `low` / `medium` / `high` | `thinkingLevel` of the same name                                                    | `reasoningEffort` of the same name, `reasoningSummary: detailed` | adaptive thinking with that effort (budget tokens on older models)                 |

`minimal` and `provider-default` are not offered: Gemini 3.7+ Flash answers both (and a
`thinkingBudget: 0`) with 400 "Request contains an invalid argument". Gemini does not stream thoughts
(`includeThoughts` is left unset); OpenAI and Anthropic stream a reasoning summary, shown as a
collapsed reasoning card. Title generation uses `reasoning: "none"`.

Gemini 3 needs thought signatures to round-trip across tool calls. They live in each part's
`providerMetadata`, which survives because messages are stored as the full `UIMessage` JSON and the
request schema passes assistant parts through.

### Limits

Only turns on an instance key are rate limited: `RATE_LIMITS.CHAT_INSTANCE_KEY`, per user per 24 hours,
default 200, overridden by `AI_INSTANCE_DAILY_LIMIT` (`0` = unlimited). User and lab keys are never
limited by PanelMaker.

### Error codes (`src/models/chat/errors.ts`)

Before streaming, `POST /api/chat` answers non-2xx with `{ "error": { code, message, provider?, source?,
labName?, resetAt? } }`. Once streaming has started, the same JSON is the stream's error text. The
client parses both with `parseChatError`.

| Code                          | Status    | Meaning                                                                                                       |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `UNAUTHENTICATED`             | 401       | No session or blocked user                                                                                    |
| `INVALID_REQUEST`             | 400       | Body failed validation                                                                                        |
| `CONVERSATION_NOT_FOUND`      | 404       | Not the viewer's conversation                                                                                 |
| `LAB_ACCESS_DENIED`           | 403       | Requested lab is not one of the viewer's labs                                                                 |
| `INVALID_MODEL`               | 400       | Model id is not `provider:model` with a supported provider                                                    |
| `NO_KEY_CONFIGURED`           | 412       | No user, lab or instance key for the provider                                                                 |
| `KEY_UNREADABLE`              | 503       | Stored key exists but cannot be decrypted                                                                     |
| `ENCRYPTION_NOT_CONFIGURED`   | 503       | Key routes: `ENCRYPTION_KEY` unset, keys cannot be stored                                                     |
| `INSTANCE_LIMIT_REACHED`      | 429       | Daily instance-key budget used up (`Retry-After`, `resetAt`)                                                  |
| `PROVIDER_AUTH_FAILED`        | 502       | Provider returned 401/403 or "invalid key"; a stored key is marked `INVALID`                                  |
| `PROVIDER_RATE_LIMITED`       | 429       | Provider returned 429 or a quota error                                                                        |
| `PROVIDER_MODEL_NOT_FOUND`    | 404       | Provider does not offer the model to this key                                                                 |
| `PROVIDER_REQUEST_REJECTED`   | 502       | Provider returned 400/422: it rejected the request settings (for example the reasoning effort) for this model |
| `PROVIDER_UNAVAILABLE`        | 502       | Provider unreachable or 5xx                                                                                   |
| `PROVIDER_ERROR` / `INTERNAL` | 502 / 500 | Anything else                                                                                                 |

Every provider error from a stream or title call is logged server-side with the status code, the
request URL (query-string keys redacted; keys are sent in headers) and the provider's response body
truncated to 2000 characters (`describeProviderError`), so a bare "invalid argument" is diagnosable.
Model call warnings from `onEnd` are logged as well.

The key routes return `{ error, code }` with the same codes; saving a key the provider rejects returns
400 `PROVIDER_AUTH_FAILED`. Saving verifies the key with a free list-models call first; if the provider
cannot be reached, the key is stored as `UNVERIFIED`.

### Operator environment

| Variable                       | Meaning                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Instance key for Google Gemini (replaces the old `GEMINI_API_KEY`)                                     |
| `OPENAI_API_KEY`               | Instance key for OpenAI                                                                                |
| `ANTHROPIC_API_KEY`            | Instance key for Anthropic                                                                             |
| `AI_DEFAULT_MODEL`             | Default model, `provider:model`; added to the picker if not in the catalog                             |
| `AI_INSTANCE_DAILY_LIMIT`      | Per-user chat turns per 24 hours on instance keys; default 200, `0` = unlimited                        |
| `ENCRYPTION_KEY`               | 32+ characters; required before users or labs can store keys. Changing it makes stored keys unreadable |

All are optional. With none of the provider keys set and no stored keys, the assistant shows a
"needs an API key" notice instead of failing.

## Data model (`prisma/schema.prisma`)

- `ChatConversation` (userId, title, model, pinned, deleted soft-delete; `@@index([userId, deleted, updatedAt])`).
- `ChatConversationMessage` (conversationId, `role` = `ChatMessageRole` enum, `content` = full
  `JSON.stringify(UIMessage)` so tool-call/reasoning parts survive reload, model, input/output tokens).
- `ApiCredential` (scope USER|LAB, userId/labId, provider, `ciphertext` AES-256-GCM, `last4` for
  masked display, `status` UNVERIFIED|VALID|INVALID plus `checkedAt`; unique on `(userId, provider)`
  and `(labId, provider)`; cascades with the user or lab).
- `ChatConversation.labId` (nullable, `SetNull` on lab delete): the lab whose shared keys the
  conversation may use.
- The old `ChatMessage` telemetry table is unchanged (admin stats still read it).

Migration: originally `20260625221534_chat_persistence`; all migrations have since been squashed into the `prisma/migrations/0_init` baseline.

## Data + infra layers

- `src/models/chat/`: `queries.ts` (`server-only`: conversation CRUD, message persistence, title
  hook, `deleteMessageAndAfter`, and the `ApiCredential` CRUD + `resolveProviderKey`),
  `transforms.ts` (pure: `deriveRole`, `storedMessageId`, summary types), `schema.ts` (Zod,
  `chatRequestSchema` is permissive because the AI SDK transport adds its own body fields),
  `index.ts` barrel.
- `src/lib/crypto.ts`: AES-256-GCM `encryptSecret`/`decryptSecret`/`maskSecret`/`isEncryptionConfigured`,
  keyed from `ENCRYPTION_KEY` (added to `src/lib/env.ts`, optional 32+ chars).
- `src/lib/ai/models.ts`: catalog (`BUILTIN_MODELS` plus `AI_DEFAULT_MODEL` if unlisted),
  `resolveLanguageModel(modelId, viewer, labContextId)` (throws `ChatError`), `getChatSetup()` for the
  picker. `src/lib/ai/config.ts` reads the instance env keys, `src/lib/ai/verify-key.ts` checks a key with a free
  list-models call, `src/lib/ai/credential-api.ts` holds the shared save/test handlers.
- `src/models/chat/keys.ts` (pure, client-safe): precedence (`rankKeySources`, `pickKeySource`), lab
  context (`resolveLabContext`), access (`canUseLabCredential`, `canManageLabCredentials` via the new
  `manage_api_keys` lab action), model annotation and default choice.
- `src/models/chat/errors.ts` (pure, client-safe): `ChatError`, error codes, friendly copy,
  `classifyProviderError` and the JSON wire format (`serializeChatError` / `parseChatError`).

## API routes

- `POST /api/chat`: validates the body (`conversationId`, `messages`, `model`, `labId`, `reasoning`), ownership-checks
  (or creates) the conversation, resolves the lab context and the key, applies the instance budget only
  on instance keys, persists the chosen model and lab on the conversation, saves the latest user turn,
  streams, then saves the assistant message + usage and titles the thread with the same model and key.
- `GET /api/chat/setup?conversationId=&labId=`: annotated models, key inventory and selected model
  (used by the floating widget).
- `GET/POST /api/chat/conversations`, `GET/PATCH/DELETE /api/chat/conversations/[id]`,
  `DELETE /api/chat/conversations/[id]/messages/[messageId]` (delete + everything after).
- `GET/POST /api/settings/api-keys`, `DELETE /api/settings/api-keys/[id]`,
  `POST /api/settings/api-keys/[id]/test` (user keys, masked; GET also returns the lab and instance
  fallbacks).
- `GET/POST /api/labs/[id]/api-keys`, `DELETE .../[credentialId]`, `POST .../[credentialId]/test` (lab
  keys, `manage_api_keys` = ADMIN/OWNER only).
- `PATCH /api/chat/conversations/[id]` also accepts `labId` (members only, else 403).

## UI

- `/chat` redirects to the most-recent (or a new) `/chat/[id]`; `/chat/[id]` is a dynamic server
  component that ownership-checks and renders `<Chat>` with server data (`notFound()` otherwise).
- `src/components/chat/chat.tsx` and `chat-sidebar.tsx` are server-data driven (no Zustand). Switching
  conversations is `router.push('/chat/[id]')`; new/rename/delete hit the API then `router.refresh()`.
  The composer has a model picker and a reasoning effort picker (`src/components/chat/model-picker.tsx`,
  effort state in `src/components/chat/use-reasoning-effort.ts`) and key notices
  (`src/components/chat/key-notice.tsx`); state lives in `src/components/chat/use-chat-setup.ts`.
- `src/components/ai-assistant-floating.tsx` loads (or creates) the user's most-recent conversation on
  open, persists through `/api/chat`, and has an "Open in full page" link. Drag/resize unchanged.
- `src/components/settings/api-keys-section.tsx` is reused on `/settings#ai-keys` (user keys) and
  `/labs/[slug]/settings#ai-keys` (shared lab keys): one row per provider with add, replace, test and
  remove, masked last 4 characters, verification status and the fallback that applies when unset.
- Removed: `src/stores/chat.ts`, the old localStorage-based model picker, `src/components/chat/chat-settings.tsx`,
  and the stale "powered by BioContextAI" line. Added an "Assistant" sidebar nav entry.

## Verification done

- `npx tsc --noEmit` clean; `eslint` + `prettier --check` clean.
- `tests/unit/chat.ts` (run via `npm run test:unit`): crypto round-trip / tamper rejection / masking,
  `deriveRole`, `storedMessageId`.
- `npm run build` passes under `cacheComponents` (every chat page reads `auth()` and is dynamic; no
  `auth()` inside a `use cache` boundary).
