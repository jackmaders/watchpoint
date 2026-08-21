---
name: Task / Developer Ticket
about: Standard developer task ticket for a feature vertical slice or bugfix
title: "task: "
labels: ["wayfinder:task"]
---

<!-- Parent spec or map issue (e.g. "Parent: #123") -->
Parent: #

## Goal & Context
<!-- Concise description of what to build and expected behavior. -->


## Target Scope & Architecture
<!-- Target directory (e.g. src/pages/<slice-name>/), route (app/routes/...), and public contracts. -->
- **Slice Path:** `src/pages/<slice-name>/`
- **Route:** `app/routes/` (thin re-export/loader only, no inline business logic)

<!--
### Design Handoff (If UI changes apply)
- **Prototype / Reference:**
- **State Expectations:**
-->

## Acceptance Criteria
<!-- What must be true for this task to be considered complete? -->
- [ ] Functionality implemented as specified
- [ ] Tests adhere to Arrange-Act-Assert (AAA) and pass under 50ms
- [ ] `bun run validate` passes (100% coverage, 0 lint/arch errors)

## Verification
```bash
bun run check:architecture
bun run test:coverage
bun run validate
```
