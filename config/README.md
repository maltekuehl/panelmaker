# Instance configuration

This directory holds operator-supplied overrides for this deployment. It is mounted read-only
into the app container at `/app/config` (set `INSTANCE_CONFIG_DIR=/app/config` to match, or leave
the default `./config` for local development).

## Legal page overrides

`legal/notice.md`, `legal/privacy.md`, and `legal/terms.md` replace the corresponding page at
`/legal/notice`, `/legal/privacy`, and `/legal/terms` when present. Each file is plain Markdown
(GitHub Flavored Markdown, sanitized before rendering) and should start with a top-level `#`
heading, since that heading is what visitors see as the page title.

Copy the matching `.md.example` file in this directory to `<name>.md` and edit it. Files without
the `.example` suffix are gitignored so your institution's legal text never gets committed to this
repository.

If a `legal/<name>.md` file is not present, the corresponding page falls back to a generic,
jurisdiction-agnostic template filled in from the `INSTANCE_*` environment variables (operator
name, institution, address, contact email). Operators in jurisdictions with statutory imprint
requirements, such as Germany's § 5 TMG / § 18 MStV, should provide a proper `legal/notice.md`
override rather than relying on the generic template.

See `.env.local.example` for the full list of `INSTANCE_*` environment variables.
