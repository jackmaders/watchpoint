# Architecture Invariants: Project FSD Variant

Divergences from standard Feature-Sliced Design (FSD v2.1) and seam boundaries for TanStack Start & Drizzle. General FSD principles, layers, and segment conventions live in the [`feature-sliced-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/feature-sliced-design/SKILL.md) skill; deep-module vocabulary lives in [`codebase-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/codebase-design/SKILL.md).

For the step-by-step authoring sequence when building new models and slices, see [`docs/architecture/entity-workflow.md`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/docs/architecture/entity-workflow.md).

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

To prevent conflating server operations, RPC transports, and client state, enforce strict naming by seam:

- **Entity Operations (`{noun}{Verb}Operation`):**
  - **Seam:** Database queries and domain business logic.
  - **Location:** `entities/<noun>/api/<noun>s.server.ts` (marked `@tanstack/react-start/server-only`).
  - **Rule:** Never imported by client code. Features never talk to the database directly; they call entity operations.
- **Server Functions (`{noun}{Verb}ServerFn`):**
  - **Seam:** HTTP / RPC transport adapters defined with `createServerFn`.
  - **Location:** Read functions in `entities/<noun>/api/*.functions.ts`; mutation functions in `features/<noun>-<verb>/api/*.functions.ts`.
  - **Rule:** Thin transport adapters. Do not embed SQL or business logic; delegate to entity operations.
- **Query Artifacts (`use{Noun}{Verb}Mutation` / `{noun}{Verb}QueryOptions`):**
  - **Seam:** TanStack Query client caching.
  - **Location:** Mutation hooks in `features/`; query options in `entities/`.

---

## 3. Database Persistence vs. Domain Models

- **Relational Drizzle Schema (`src/shared/db/schema/`):**
  - Centralized in `shared/` to support foreign keys and relations without circular slice dependencies.
  - Exposes database tables and relations via `src/shared/db/schema/index.ts`.
- **Domain Models (`src/entities/<noun>/model/`):**
  - Exposes Zod schemas, business types, and domain invariants.
  - Callers and UI consume entity domain models, never raw Drizzle table schemas.
