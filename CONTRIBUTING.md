# Contributing to PanelMaker

PanelMaker is developed in the open at [github.com/complextissue/panelmaker](https://github.com/complextissue/panelmaker). Institutions run their own instances of it; this repository is the shared upstream project that all of them build on. Contributions of code, documentation, bug reports and feature ideas are welcome.

## Code of Conduct

This project follows the Contributor Covenant. The text ships with the app at `/docs/community/conduct` (source: [`app/docs/(markdown)/community/conduct/page.mdx`](<app/docs/(markdown)/community/conduct/page.mdx>)). By taking part you agree to uphold it.

## Where to go

- **Bugs**: search the [issues](https://github.com/complextissue/panelmaker/issues) first, then open one with the bug report template.
- **Feature ideas and questions**: start a [discussion](https://github.com/complextissue/panelmaker/discussions) or open an issue with the feature request template. Planned work is tracked in the issues.
- **Security vulnerabilities**: do not open a public issue. Report them privately as described in [SECURITY.md](SECURITY.md).
- **Problems with your own instance**: check the [self-hosting guide](docs/self-hosting/README.md), then open an issue or discussion. Instance operators, not the upstream project, are responsible for the content and accounts on their instance.

## Development setup

Follow [Development in the README](README.md#development): Node.js from `.nvmrc`, PostgreSQL (the dev Compose file can run it), `npm run seed:all` for demo data, `npm run dev`.

Before you start on something larger, read:

- [AGENTS.md](AGENTS.md) for the project conventions: the `models/<entity>/` data layer, API route patterns, UI and copy rules
- [docs/development](docs/development/README.md) for the architecture and design notes

## Making a change

1. Fork the repository and create a branch from `main`, for example `fix/panel-export-order` or `feature/lab-inventory-filter`.
2. Make the change. Keep pull requests focused on one thing.
3. Run the checks:

   ```bash
   npm run lint          # Prettier and ESLint
   npx tsc --noEmit      # type check
   npm run test:unit     # unit tests
   npm test              # Playwright end-to-end tests
   ```

4. Add or update tests for new behavior. End-to-end tests live in `tests/*.spec.ts`, unit tests in `tests/unit/`.
5. Update the docs when behavior, configuration or commands change: `README.md`, `docs/self-hosting/` for anything an operator notices, `app/docs/` for anything a user notices, and `.env.local.example` plus `lib/env.ts` for new settings.
6. Open a pull request using the template and link related issues (`Fixes #123`).

Commit messages follow the conventional commit style (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Husky runs Prettier and ESLint on staged files before each commit.

### Database changes

Create migrations with `npx prisma migrate dev --create-only --name <descriptive_name>`, review the generated SQL, then apply it with `npx prisma migrate dev`. Commit the migration together with the schema change. Instances apply migrations automatically on deploy, so a migration must work on a database that already holds data. Call out anything destructive in the pull request.

### Copy and UI

User-facing text is plain and direct. Do not use em dashes, en dashes (except in numeric ranges) or middle dots in copy. Use the shadcn/ui components in `components/ui/` and theme tokens rather than hard-coded colors. The details are in [AGENTS.md](AGENTS.md).

## Review

A maintainer reviews each pull request. Expect questions and requests for changes; once approved, a maintainer merges it. Changes reach an instance when its operator upgrades.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
