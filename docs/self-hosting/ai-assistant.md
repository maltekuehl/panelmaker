# AI assistant

The assistant is a chat that answers questions about markers, antibodies, validation reports, lab inventory and panels by querying the instance database through a fixed set of tools. It can also create and edit the user's own panels when asked. It runs on Google Gemini, OpenAI or Anthropic models.

There is no free or shared PanelMaker key. Every chat request runs on a provider API key that someone on this instance configured. If no key is available, the assistant shows a notice explaining where to add one.

## Where keys come from

Keys exist at three levels. For the provider of the selected model, the first key found in this order is used:

1. **User key.** Added by a user under Settings (`/settings#ai-keys`). Used only for that user's own conversations.
2. **Lab key.** Added by a lab owner or admin in the lab settings (`/labs/<slug>/settings#ai-keys`). Used only for conversations acting in that lab, and only while the user is a member of it. Users in several labs choose the lab from the model menu ("Use lab keys from"); the default is the lab they joined first.
3. **Instance key.** Set by the operator with `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.

The chat shows which level a model will use ("Using your key", "Using <lab> key", "Using the instance key"). Models whose provider has no key at any level are shown as unavailable.

Users and lab admins can add, replace, test and remove keys. A key is checked with a free list-models call to the provider when it is saved; a key the provider rejects is not stored, and a key that could not be checked because the provider was unreachable is stored as unverified. Only the last four characters are ever shown again.

## Operator choices

| Goal                                                        | Configuration                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| No assistant costs for the operator                         | No instance keys. Set `ENCRYPTION_KEY` so users and labs can bring their own keys.                       |
| Operator pays, within a budget                              | One or more instance keys, plus `AI_INSTANCE_DAILY_LIMIT`.                                               |
| Operator pays, labs or users may use their own keys as well | Instance keys and `ENCRYPTION_KEY`.                                                                      |
| Assistant off                                               | No instance keys and no `ENCRYPTION_KEY`. The chat stays visible but explains that no key is configured. |

Without `ENCRYPTION_KEY`, users and labs cannot save keys (the key routes answer with an "encryption not configured" error), and any previously stored keys are ignored.

## Models

`AI_DEFAULT_MODEL` sets the default model as `provider:model`, for example `anthropic:claude-sonnet-5-5`. Without it the default is `google:gemini-3.5-flash-lite`. The model menu offers a short built-in catalog (in [`lib/ai/models.ts`](../../lib/ai/models.ts)) plus the default model if it is not in the catalog. Any `provider:model` string the provider accepts works, so newer models do not need a code change.

A new conversation starts with the model and lab of the user's most recent conversation, then the default model. If that model has no key, the first model that does is picked.

Users can also choose a reasoning effort next to the model menu: Minimal, Low (the default), Medium or High. It maps onto each provider's own reasoning or thinking setting. Higher effort usually means slower and more expensive answers. The choice is stored in the user's browser.

## Cost and limits

Only requests that run on an instance key are limited by PanelMaker. Each user gets `AI_INSTANCE_DAILY_LIMIT` requests per rolling 24 hours on the instance keys (default `200`, `0` means unlimited). When a user hits the limit, the chat tells them when it resets and suggests adding their own key. Requests on user or lab keys are never counted; the provider's own limits apply.

The limit counts requests, not tokens. A request is one chat turn, which may involve several tool calls and model steps (up to 15) and at most 10,000 output tokens. To cap spending, also set a budget or spending limit in the provider's console for the instance key.

Token usage per model is logged and visible to admins under `/admin/stats`. See [Administration](./administration.md#statistics).

## Privacy

Chat messages, including anything the assistant reads from the database to answer, are sent to the model provider whose key is used. Conversations are stored in the instance database and are visible only to their owner. Tell your users which providers the instance keys use, and mention it in your privacy policy if you configure instance keys. See [Legal pages and branding](./legal-and-branding.md).

## `ENCRYPTION_KEY`

User and lab keys are stored encrypted with AES-256-GCM. The encryption key is derived from `ENCRYPTION_KEY` (at least 32 characters). Generate it once:

```bash
openssl rand -hex 32
```

Consequences:

- Back it up together with the database. A restored database is useless for stored keys without the same `ENCRYPTION_KEY`.
- Changing it makes every stored user and lab key unreadable. There is no re-encryption step and no support for several keys at once. Unreadable keys are skipped, so chats fall back to the next level (lab key, then instance key); if nothing is left, the chat reports that the stored key cannot be read. Users and lab admins then have to enter their keys again.
- Removing it disables stored keys entirely: only instance keys work.
- An empty value (`ENCRYPTION_KEY=""`) fails validation and stops the production server. Delete the line instead.

Rotate it only when you have to, for example after a leak, and tell users and lab admins to re-enter their keys.

## Developer notes

The design, error codes and data model are described in [docs/development/chat-persistence.md](../development/chat-persistence.md).
