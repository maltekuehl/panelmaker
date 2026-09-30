# Development docs

For contributors working on the PanelMaker code. Setup instructions are in the [README](../../README.md#development) and [CONTRIBUTING.md](../../CONTRIBUTING.md). Conventions for code, data layer and UI are in [AGENTS.md](../../AGENTS.md).

| Document                                              | What it covers                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Architecture](./architecture.md)                     | Stack, directory layout, data model, request lanes, tests                                 |
| [Chat persistence and AI keys](./chat-persistence.md) | Design notes for the assistant: key precedence, reasoning effort, error codes, data model |
| [Lab structure](./lab-structure/README.md)            | Design notes for labs, roles, visibility and the lab inventory                            |
| [IBEX import](./ibex-import.md)                       | How the IBEX knowledge base maps onto the PanelMaker schema, and how to refresh it        |
| [Metadata standards](./metadata-standards.md)         | Research on ontologies, community metadata standards and external APIs, with a plan       |

The design notes record decisions as they were made. Where they disagree with the code, the code is right; please fix the note.
