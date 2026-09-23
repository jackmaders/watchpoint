# Architecture Decisions: Project FSD Variant

This document records this project's specific adaptations and divergences from standard Feature-Sliced Design (FSD v2.1).

For general FSD principles, layers, and segment conventions, consult the [`feature-sliced-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/feature-sliced-design/SKILL.md) skill. Deep-module vocabulary is defined in [`codebase-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/codebase-design/SKILL.md).

---

## 1. Project Divergences from Standard FSD

Standard FSD encourages a *pages-first* extraction loop ("start everything in `pages/` and extract downward only after multi-page duplication"). **We explicitly reject pages-first in this codebase**:

| Standard FSD v2.1 Rule | Our Project Variation | Rationale |
| :--- | :--- | :--- |
| **Pages-First Extraction:** Start in `pages/`, extract only when code is duplicated across multiple pages. | **Features-First & Entities-First:** Meaningful domain logic and user interactions begin immediately in `entities/` or `features/`. | `pages/` are strictly thin screen composition wrappers. Domain models and actions earn their boundaries upfront through depth and clear interfaces, not through accidental multi-page duplication. |
| **Widgets Layer:** Widely discouraged in standard FSD v2.1. | **Widgets for Composite Reads:** `widgets/<noun>-<purpose>` is actively used for composite, read-oriented screen UI (e.g. `widgets/post-feed`). | Keeps read queries and composite screen modules out of interaction features. User actions go to `features/`; composite read displays go to `widgets/`. |
| **Slice Naming:** Flexible names per layer. | **Strict Grammatical Naming:**<br>• Features: `{noun}-{verb}` (e.g., `post-create`)<br>• Entities: `{noun}` (e.g., `post`)<br>• Widgets: `{noun}-{purpose}` | Eliminates ambiguity. A feature name strictly describes a user interaction. |
| **Insignificant Slices:** Steiger flags single-consumer slices as errors. | **Disabled for Features & Widgets:** Single-consumer interactions and compositions are permitted. | An interaction (`features/session-sign-in`) is architecturally valid even if only mounted by one page. |

---

## 2. Layer & Seam Responsibilities

The downward dependency direction applies strictly:
`app` → `pages` → `widgets` → `features` → `entities` → `shared`.

```text
app/          → Framework configuration, TanStack router setup, root layout, route adapters (createFileRoute).
pages/        → Pure screen-level composition. Mounts widgets and features together. No business logic.
widgets/      → Composite, read-oriented display UI (e.g., PostFeed). Queries entities; renders views.
features/     → Exactly ONE user interaction ({noun}-{verb}). Owns UI mutation forms, optimistic state,
                cache invalidation, and the server-function transport entrypoint.
entities/     → Reusable domain entity logic ({noun}). Domain validation schemas, reusable display UI
                (e.g., PostCard), and database operations.
shared/       → Business-agnostic infrastructure, UI primitives, database connection, and relational schema.
```

---

## 3. Server Functions & Operation Terminology

To avoid confusing TanStack Query mutations/queries with backend operations, terminology is strictly partitioned by seam:

- **Entity Operations (`Operation` suffix):**
  - Stored in `entities/<noun>/api/<noun>s.server.ts`.
  - Database-backed business operations named `{noun}{Verb}Operation` (e.g. `postCreateOperation`, `postListOperation`).
  - Protected with `@tanstack/react-start/server-only`. Never imported by client code.
- **Server Functions (`ServerFn` suffix):**
  - Transport adapters defined with `createServerFn` in `*.functions.ts`.
  - Read transport lives in `entities/<noun>/api/*.functions.ts`.
  - Mutation/interaction transport lives in `features/<noun>-<verb>/api/*.functions.ts`.
  - Both delegate directly to entity operations rather than containing database logic.
- **Client Hooks (`use...Mutation` / `...QueryOptions`):**
  - Reserved strictly for TanStack Query artifacts in features (`usePostCreateMutation`) and entities (`postListQueryOptions`).

---

## 4. Shared Persistence vs. Entity Schemas

Relational database schemas are not split into entity slices:

1. **Shared Persistence (`src/shared/db/schema/`):**
   - All Drizzle table definitions and relations live together in `src/shared/db/schema/`.
   - Exported centrally from `src/shared/db/schema/index.ts`. This preserves foreign keys and relational integrity without forcing circular imports between entity slices.
2. **Domain Schemas (`src/entities/<noun>/model/`):**
   - Pure domain validation shapes (Zod) and business types exposed to the rest of the application. Callers never depend directly on the database driver representation.

---

## 5. Adding a Relational Entity Workflow

Follow this sequence:
1. Define the Drizzle table in `src/shared/db/schema/<noun>.ts` and export it from `schema/index.ts`.
2. Define domain schemas and types in `src/entities/<noun>/model/`.
3. Implement entity operations (`postCreateOperation`) and query options in `src/entities/<noun>/api/`.
4. Create reusable UI (`PostCard`) in `src/entities/<noun>/ui/` if applicable.
5. Create user interaction slices in `src/features/<noun>-<verb>/` for mutations (handling forms, cache invalidation, and server functions).
6. Compose reads in `widgets/` and mount screens in `pages/`.
7. Verify architecture with `bun run check:architecture` (Steiger).
