# Architecture

This project divergences from standard Feature-Sliced Design (FSD v2.1) and seam boundaries for TanStack Start & Drizzle. General FSD principles, layers, and segment conventions live in the [`feature-sliced-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/feature-sliced-design/SKILL.md) skill; deep-module vocabulary lives in [`codebase-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/codebase-design/SKILL.md).

---

## 1. Divergences from Standard FSD

- **Upfront Domain & Action Placement (No Pages-First):** Domain models and user actions begin directly in `entities/` or `features/`, not deferred in `pages/`. Single-consumer slices are intentional and architecturally valid; Steiger's insignificant slices rule is disabled for `features/` and `widgets/`.
- **Widgets for Composite Reads:** `widgets/<noun>-<purpose>` is actively used for composite, read-oriented multi-entity displays (e.g. `widgets/post-feed`). Pages only assemble views; features own mutations.
- **Strict Grammatical Slice Naming:**
  - `entities/<noun>` (domain models, e.g. `entities/post`)
  - `features/<noun>-<verb>` (user interactions, e.g. `features/post-create`)
  - `widgets/<noun>-<purpose>` (composite read views, e.g. `widgets/post-feed`)

---

## 2. Seam Boundaries & Operation Naming

To prevent conflating server handlers, RPC transports, and client state, enforce strict naming by seam:

- **Entity Operation Handlers (`{noun}{Verb}Handler`):**
  - **Seam:** Database queries and domain business logic.
  - **Location:** `{entities,features}/<noun>/api/<noun>s-handlers.server.ts` (marked `@tanstack/react-start/server-only`).
  - **Rule:** Never imported by client code. Components or server functions never talk to the database directly; they call entity handlers.
- **Server Functions (`{noun}{Verb}ServerFn`):**
  - **Seam:** HTTP / RPC transport adapters defined with `createServerFn`.
  - **Location:** Read functions in `{entities,features}/<noun>/api/*.functions.ts`; mutation functions in `{entities,features}/<noun>-<verb>/api/*.functions.ts`.
  - **Rule:** Thin transport adapters. Do not embed SQL or business logic; delegate to entity handlers.
- **Query Artifacts (`use{Noun}{Verb}Mutation` / `{noun}{Verb}QueryOptions`):**
  - **Seam:** TanStack Query client caching.
  - **Location:** Mutation hooks in `features/`; query options in `entities/`.

---

## 3. Allowed Filename Suffixes

Use only these suffixes when the corresponding meaning applies:

- `.server.*` — Modules with a direct server/environment-specific dependency that needs import protection (for example, `cloudflare:workers`).
- `.client.*` — Modules with a direct browser/environment-specific dependency that needs import protection.
- `.functions.ts` — TanStack Start `createServerFn` transport wrappers.
- `.lazy.tsx` — TanStack Router lazy route modules under `src/app/routes`.
- `index.ts` — The default public API of a slice or segment.
- `index.server.ts`, `index.client.ts`, `index.async.ts` — specialized public API entrypoints to avoid unwanted imports.

Do not invent additional dot-separated suffixes. Use descriptive kebab-case names for ordinary modules in the format of `{noun}-{purpose}.ts`, such as `post-validation.ts`, `user-query-options.ts`, and `comment-create-handlers.ts`.

---

## 4. Database Persistence vs. Domain Models

- **Relational Drizzle Schema (`src/shared/db/schema/`):**
  - Centralized in `shared/` to support foreign keys and relations without circular slice dependencies.
  - Exposes database tables and relations via `src/shared/db/schema/index.ts`.
- **Domain Models (`src/entities/<noun>/model/`):**
  - `validation.ts` exposes Zod schemas derived from the Drizzle table schema.
  - `types.ts` exposes inferred TypeScript types from those Zod schemas.
  - Business invariants belong alongside the relevant domain model and should be enforced by the entity handler before persistence.
  - Callers and UI consume entity domain models, never raw Drizzle table schemas.
