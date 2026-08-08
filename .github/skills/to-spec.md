---
name: to-spec
description: Turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
---

This skill takes the current conversation context and codebase understanding and produces a structured specification. Do NOT interview the user — just synthesize what you already know.

### Your Target Stack
Align all technical specification details with this target stack:
* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS v4.
* **Architecture:** Feature-Sliced Design (FSD) (Pages-First). All UI/business logic lives in `src/_pages/`. Next.js `app/` routes MUST be simple barrel re-exports of `src/_pages/` slices.
* **Backend/Data:** Cloudflare D1 (SQLite), Drizzle ORM (`drizzle/` schema & migrations).
* **Tooling:** Biomejs for linting/formatting.

### Process

1. Review the conversation history and codebase context to understand the scope and architectural decisions made. Use the project's domain vocabulary throughout the spec.
2. Identify testing seams. Existing seams should be preferred to new ones. Use the highest seam possible.
3. Write the spec using the template defined in [.github/templates/feature-spec-template.md](file:///home/jackw/projects/watchpoint/.github/templates/feature-spec-template.md).
