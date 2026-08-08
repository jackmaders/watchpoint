Parent: #<Parent Spec Issue Number>

## 1. Goal & Context ("What to Build")

<Concise overview of end-to-end functionality to build in this vertical slice. Describe the exact behavior expected from both user and system perspectives.>

## 2. Target File Scope & FSD Architecture

* `src/_pages/<slice-name>/` implementation files and corresponding tests

## 3. Technical Constraints & Contracts

* Follow Red -> Green -> Refactor TDD workflow
* No inline business logic or UI rendering in `app/` routes

## 4. Step-by-Step Implementation Guide

1. **Red (Test First):** Write failing test for slice functionality.
2. **Implementation:** Implement schema, logic, and UI.
3. **Green & Refactor:** Verify tests pass and clean up code.

## 5. Acceptance Criteria & Definition of Done

- [ ] Complete implementation as specified
- [ ] FSD architecture check passes (`bun run check:architecture`)
- [ ] 100% test coverage threshold met (`bun run test:coverage`)

## 6. Verification Commands
```bash
bun run check:architecture
bun run test:coverage
```
