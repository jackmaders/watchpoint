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

To prevent conflating server operations, RPC transports, and client state, enforce strict naming by seam:

- **Entity Operations (`{noun}{Verb}Operation`):**
  - **Seam:** Database queries and domain business logic.
  - **Location:** `entities/<noun>/api/<noun>s.server.ts` (marked `@tanstack/react-start/server-only`).
  - **Rule:** Never imported by client code. Features never talk to the database directly; they call entity operations.
- **Server Functions (`{noun}{Verb}ServerFn`):**
  - **Seam:** HTTP / RPC transport adapters defined with `createServerFn`.
  - **Location:** Read functions in `entities/<noun>/api/*.functions.ts`; mutation functions in `features/<noun>-<verb>/api/*.functions.ts` (or `entities/<noun>/api/*.functions.ts`, if reused).
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

---

## 4. Lazy-Loaded Modules in FSD Slices

To enable clean bundle splitting for heavy client runtimes or non-critical UI without leaking loading mechanics or violating FSD public API boundaries:

- **Clean Slice Entry Point (`index.ts`):**
  - `index.ts` remains a pure export contract. Do not inline component definitions, JSX, or complex `lazy()` factories directly in `index.ts`.
  - Export the lazy-loaded component under its canonical domain name (e.g. `export { SessionPanel } from "./ui/lazy-session-panel"`).
  - Never export both eager and lazy variants of the same component from the same barrel (`index.ts`), as static imports poison bundler tree-shaking and negate dynamic chunk splitting.
- **Dedicated Internal Lazy Module (`ui/lazy-<component>.tsx`):**
  - Colocate the dynamic `lazy()` call and self-suspending wrapper in a dedicated module inside the `ui/` segment (e.g. `src/features/session-manage/ui/lazy-session-panel.tsx`).
  - Use standard kebab-case naming (`lazy-<component>.tsx`). Reserve `.lazy.tsx` exclusively for TanStack Router route files in `src/app/routes/` where the framework router compiler specifically handles route-level splitting.
- **Self-Suspending Encapsulation:**
  - Wrap the dynamic component in a local `<Suspense fallback={fallback}>` inside the lazy module, defaulting to the slice's dedicated fallback (e.g. `<SessionPanelFallback />`).
  - Callers render `<Component />` cleanly without having to manage external Suspense wrappers or risking unhandled Suspense runtime errors.

