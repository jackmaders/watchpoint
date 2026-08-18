Parent: #<Parent Spec Issue Number>

## 1. Goal & Context ("What to Build")

<Concise overview of end-to-end functionality to build in this vertical slice. Describe the exact behavior expected from both user and system perspectives.>

## 2. Design Handoff (UI changes)

* **Prototype branch:** `<branch linked from this ticket>` | `N/A — no UI changes`
* **Selected UI / state expectations:** `<summary or N/A>`
* **Routing:** `needs-prototype` for unknown behaviour/state; `needs-design` for uncertain presentation; when both apply, resolve behaviour first.

## 3. Target File Scope & FSD Architecture

* `src/_pages/<slice-name>/` implementation files and corresponding tests

## 4. Technical Constraints & Contracts

* Follow Red -> Green -> Refactor TDD workflow
* No inline business logic or UI rendering in `app/` routes

## 5. Step-by-Step Implementation Guide

1. **Red (Test First):** Write failing test for slice functionality.
2. **Implementation:** Implement schema, logic, and UI.
3. **Green & Refactor:** Verify tests pass and clean up code.

## 6. Acceptance Criteria & Definition of Done

- [ ] Complete implementation as specified
- [ ] FSD architecture check passes (`bun run check:architecture`)
- [ ] 100% test coverage threshold met (`bun run test:coverage`)

## 7. Verification Commands
```bash
bun run check:architecture
bun run test:coverage
```
