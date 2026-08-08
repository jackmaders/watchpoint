# [TICKET-ID] <Short, Actionable Title>

**Parent Epic:** #<Parent Spec Issue Number>  
**Status:** Blocked / Ready for Implementation  
**Blocked By:** <#Ticket-ID or "None — can start immediately">  

---

## 1. Goal & Context ("What to Build")
<Concise overview of end-to-end functionality to build in this vertical slice. Describe the exact behavior expected from both user and system perspectives.>

## 2. Target File Scope & FSD Architecture
* **Slice Directory:** `src/_pages/<slice-name>/`
* **Files to Create/Modify:**
  * `[NEW/MODIFY]` `drizzle/schema.ts` — <Schema changes if applicable>
  * `[NEW/MODIFY]` `src/_pages/<slice-name>/model/<actions-or-logic>.ts` — <Business logic & Server Actions>
  * `[NEW/MODIFY]` `src/_pages/<slice-name>/ui/<Component>.tsx` — <UI components>
  * `[NEW/MODIFY]` `app/<route>/page.tsx` — <Barrel re-export only: export { SlicePage as default } from "@/_pages/<slice-name>">
  * `[NEW/MODIFY]` `src/_pages/<slice-name>/<filename>.spec.ts` — <Unit & integration tests>

## 3. Technical Constraints & Contracts
* **Schema / API Signatures:**
  ```typescript
  // Exact contract requirements for this ticket
  ```
* **Architectural Invariants:**
  * Follow Red -> Green -> Refactor TDD workflow.
  * No inline business logic or UI rendering allowed in `app/` routes.
  * Extracted features in `src/features/` must use `{action}-{entity}` naming.

## 4. Step-by-Step Implementation Guide
1. **Red (Test First):** Write failing test in `src/_pages/<slice-name>/<filename>.spec.ts` covering <specific behavior/seam>.
2. **Data & Server Logic:** Implement/update Drizzle ORM schema and Server Actions.
3. **UI Layer:** Implement React component with Tailwind CSS v4 styling in `src/_pages/<slice-name>/ui/`.
4. **Green (Verification):** Run tests to verify implementation passes.
5. **Refactor:** Clean up code while maintaining 100% coverage.

## 5. Acceptance Criteria & Definition of Done
- [ ] **Data/Backend:** Schema migrations and Server Actions are functional and handle valid/invalid inputs.
- [ ] **UI Rendering:** Component handles loading, error, and success states correctly.
- [ ] **Architecture:** FSD public API boundaries (`index.ts`) and `app/` re-exports are respected.
- [ ] **Tests:** Unit/integration tests pass in `< 50ms` per test block.
- [ ] **Coverage:** 100% test coverage threshold met for modified/new files (`bun run test:coverage`).
- [ ] **Linter:** Steiger and Biome architecture check passes cleanly (`bun run check:architecture`).

## 6. Verification Commands
```bash
bun run check:architecture
bun run test:coverage
```
