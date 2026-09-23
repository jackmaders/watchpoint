# Entity Workflow Recipe

Step-by-step sequence for implementing a new relational entity and its associated features. For architectural invariants and seam definitions, consult [`docs/architecture.md`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/docs/architecture.md).

---

## Authoring Sequence

1. **Relational Database Schema:**
   - Define the Drizzle table in [`src/shared/db/schema/<noun>.ts`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/src/shared/db/schema).
   - Export the table and relations centrally from [`src/shared/db/schema/index.ts`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/src/shared/db/schema/index.ts).

2. **Domain Models & Validation:**
   - Define domain Zod schemas, inferred types, and business invariants in `src/entities/<noun>/model/`.

3. **Backend Entity Operations & Query Options:**
   - Implement database operations in `src/entities/<noun>/api/<noun>s.server.ts` using the `{noun}{Verb}Operation` convention (marked `@tanstack/react-start/server-only`).
   - Implement read transport functions (`{noun}{Verb}ServerFn`) in `src/entities/<noun>/api/*.functions.ts`.
   - Expose TanStack Query options (`{noun}{Verb}QueryOptions`) in `src/entities/<noun>/api/`.

4. **Reusable Entity UI (Leaf Components):**
   - Create presentational display components (e.g. `PostCard`) in `src/entities/<noun>/ui/`.

5. **Mutation Features (Orchestrator Components):**
   - Create single-interaction feature slices in `src/features/<noun>-<verb>/`.
   - Implement mutation server functions (`{noun}{Verb}ServerFn`) in `src/features/<noun>-<verb>/api/*.functions.ts`, delegating directly to entity operations.
   - Implement client mutation hooks (`use{Noun}{Verb}Mutation`) with cache invalidation and optimistic updates.
   - Compose the form / action UI in `src/features/<noun>-<verb>/ui/`.

6. **Screen Assembly:**
   - Compose multi-entity read displays in `src/widgets/<noun>-<purpose>/` (e.g. `widgets/post-feed`).
   - Mount widgets and features in `src/pages/` as thin screen wrappers.

7. **Verification:**
   - Run architecture linting: `bun run check:architecture` (Steiger).
