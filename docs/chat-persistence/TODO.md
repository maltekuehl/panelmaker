# Chat persistence: TODO / follow-ups

Core feature is shipped (Phases 1-7). Remaining and optional work:

## Deployment / config
- [ ] Set `ENCRYPTION_KEY` (32+ chars) in every environment before users save provider keys. Until
      then, `POST /api/settings/api-keys` and the lab equivalent return 503 and the settings UI shows
      a "Server encryption is not configured" notice. Add it to `.env`, `.env.test`, and prod secrets.

## Tests
- [ ] Add authenticated Playwright coverage to `tests/chat.spec.ts`: send a message, reload, assert
      the conversation + messages (incl. tool cards) persist; assert `/chat/<someone-else-id>` returns
      not-found; assert the new-conversation flow changes the URL to `/chat/[id]`. Needs a logged-in
      fixture and a stubbed or live `GEMINI_API_KEY`.
- [ ] Add a unit assertion for `parseModelId` / model resolution precedence (currently only covered
      indirectly; the module is `server-only`, so the test stubs `server-only` like `tests/unit/chat.ts`).

## Models / "any model string"
- [ ] Let users pick or type an arbitrary `provider:model` string in the composer / settings, not just
      the curated `BUILTIN_MODELS` list (`lib/ai/models.ts`). Resolution already accepts any string.
- [ ] Evaluate the Vercel AI Gateway (`@ai-sdk/gateway`) so truly arbitrary models work without
      per-provider SDK wiring; would replace the `switch (provider)` in `resolveLanguageModel`.
- [ ] Surface which provider/key a model resolves to (user vs lab) in the model selector so users
      understand precedence (user credential -> lab credential -> community Google key).

## UX / behaviour
- [ ] Decide on a per-conversation message cap (the reference app used 40) or rely solely on
      `RATE_LIMITS.CHAT_FREE`. No credit system by request.
- [ ] Floating widget: add a lightweight "new chat" affordance (today management lives only on /chat).
- [ ] Consider one-time import of any existing `localStorage` conversations on first load after deploy
      (currently not migrated; old browser data is simply abandoned). Low priority.
- [ ] Re-add per-message in-place edit (the refactor kept delete + edit-and-regenerate; plain "save
      edit" without regeneration was dropped) if users want it; needs a message-update endpoint.

## Nice-to-have
- [ ] Pin/unpin UI for conversations (the `pinned` column + ordering exist server-side; no toggle yet).
- [ ] Conversation search in the sidebar for users with many threads.
