# Domain Docs

This file records where this repo's domain context and Architectural Decision Records (ADRs) live, and how skills consume them, clearly delineating between the **Matt Pocock Upstream Contract** and **Watchpoint Built-on-Top Extensions**.

---

## 1. Matt Pocock Upstream Originals (Canonical Contract)

### Layout: Single-Context

This repo uses the canonical **single-context** domain doc layout.

| Concept | Location |
| :--- | :--- |
| **Domain vocabulary** | `CONTEXT.md` at the repo root |
| **Architectural Decision Records (ADRs)** | `docs/adr/*.md` |

### Consumer Rules for Skills

When a skill instruction says "read the domain docs" or "check existing ADRs", follow these rules:

1. **Vocabulary lookup**: Read `CONTEXT.md` at the repo root to resolve domain-specific jargon before writing code or specifications.
2. **ADR lookup**: Check `docs/adr/` for relevant decision records when making architectural choices. Match ADR titles against the area of code you are modifying.
3. **Updating vocabulary**: When `/grill-with-docs` or `/domain-modeling` introduces a new domain concept or settles a term, append it to `CONTEXT.md` under the appropriate heading.
4. **Recording decisions**: When a design choice is settled during grilling or spec creation, create a new numbered ADR in `docs/adr/<NNNN>-<short-name>.md` following the template in existing ADRs.

---

## 2. Watchpoint Built-on-Top Extensions

- **Automated Context Ingestion ([`scripts/agents/runner.ts`](file:///home/jackmaders/projects/watchpoint/scripts/agents/runner.ts))**: In Watchpoint's headless GitHub Actions pipeline, the contents of `CONTEXT.md` are automatically prepended into the runner's system prompt context. This ensures that non-interactive agent runs (`agent-grill.yml`, `agent-spec.yml`, `agent-implement.yml`) maintain full domain vocabulary alignment without requiring manual interactive file reads.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-youtube-media-player.md
│   ├── 0002-hybrid-relational-schema-polymorphic-input.md
│   ├── 0003-uniform-multiple-choice-v1-input-engine.md
│   └── 0004-cloudflare-native-deployment.md
└── src/
```

There is no `CONTEXT-MAP.md` and no multi-context layout — Watchpoint is a single Next.js app with one `src/`, not a monorepo.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0002 (hybrid relational schema) — but worth reopening because…_
