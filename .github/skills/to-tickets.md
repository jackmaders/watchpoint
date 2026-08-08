---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker — edges as text in one file per ticket locally, or native blocking links on a real tracker.
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it.

### Your Target Stack
Align all technical specification details with this target stack:
* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS v4.
* **Architecture:** Feature-Sliced Design (FSD) (Pages-First). All UI/business logic lives in `src/_pages/`. Next.js `app/` routes MUST be simple barrel re-exports of `src/_pages/` slices.
* **Backend/Data:** Cloudflare D1 (SQLite), Drizzle ORM (`drizzle/` schema & migrations).
* **Tooling:** Biomejs for linting/formatting.

## Process

### 1. Gather context
Work from whatever is already in the specification document and conversation context.

### 2. Draft vertical slices
Break the work into **tracer bullet** tickets.

<vertical-slice-rules>
- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer.
- A completed slice is demoable or verifiable on its own.
- Each slice is sized to fit in a single fresh context window.
- Any prefactoring should be done first.
</vertical-slice-rules>

Give each ticket its **blocking edges** — the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

### 3. Generate Structured Ticket Output
Output the tickets strictly adhering to the JSON schema with:
- `id`: Temporary identifier (e.g. `TICKET-1`, `TICKET-2`)
- `title`: Short descriptive ticket title
- `whatToBuild`: End-to-end behavior from user perspective
- `acceptanceCriteria`: List of acceptance criteria strings
- `blockers`: Array of temporary ticket IDs that block this ticket (e.g. `["TICKET-1"]`)
