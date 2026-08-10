# Coding Standards

This is the file `code-review`'s Standards axis reads. It is the surviving content of the
Developer and Reviewer agent skills deleted in #50 — the parts that describe how code
*should* be written, independent of any specific ticket's requirements. The Spec axis
(does this PR do what the issue asked?) is judged against the issue, not this file.

## Feature-Sliced Design (Pages-First)

- Keep UI components, business logic, and server actions inside the relevant
  `src/_pages/<slice-name>/` directory by default.
- Do not extract logic into `features/` or `widgets/` until a second consumer explicitly
  requires it.
- Cross-slice imports go through a slice's public API (`index.ts`) only.
- `bun run check:architecture` (Steiger) enforces this — treat a failure as a real
  violation, not a linter to silence.

## Feature naming — action-first

Features extracted into `src/features/` are named `{action}-{entity}` (verb-noun): `create-user`,
`submit-feedback`. A feature's name describes what it does, not just what it's about.

## Next.js routing directory (`app/`) — barrel-only

Every file under `app/` MUST be a simple barrel re-export:

```ts
export { HomePage as default } from "@/_pages/home";
```

No inline business logic, data fetching, or UI rendering in `app/`. All page logic lives
in the FSD `src/_pages/` layer.

## Test file location

Every unit test file lives in an adjacent `__tests__` directory (matching
`**/__tests__/*.spec.{ts,tsx}`), never beside the source file it tests.

## Test structure — Arrange, Act, Assert

Every test case is organized into three explicit, commented phases:

```ts
test("calculateTotal sums line items", () => {
  // Arrange
  const items = [{ price: 10 }, { price: 5 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(15);
});
```

No non-assertion statements follow `expect(...)` or `await expect(...)` in a test block.
`plugins/enforce-aaa-assertions.grit` enforces this — see Grit plugin locks below.

Prefer integration-style tests through the public interface over mocking internal
collaborators, and use an independent expected value rather than recomputing the
implementation's own formula:

```ts
// GOOD — independent literal, not the implementation's formula
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  expect(calculateTotal(items)).toBe(15);
});

// BAD — tautological: expected value recomputes the implementation
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});
```

## Test speed

Every test block executes in under 50ms. A slow test is almost always reaching a real
database, filesystem, or network — replace the dependency at the seam, don't add a
timeout.

## Test coverage

100% coverage — statements, branches, functions, and lines — enforced via
`bun run test:coverage`. There is no partial-coverage carve-out for a slice, a file, or a
line marked "trivial."

## No console output in tests

Tests must not write to `console` (`console.log`, `console.warn`, `console.error`,
React `act(...)` warnings). Console output during a test run is a failure, not a warning.

## Grit plugin locks

Two Grit plugins are structural locks on this repo's test discipline and MUST NOT be
edited, weakened, or extended with bypass exceptions:

- `plugins/enforce-automocking.grit` — see "Manual mocks" below.
- `plugins/enforce-aaa-assertions.grit` — see "Test structure" above.

## Manual mocks — `__mocks__` only

Inline manual mock factory overrides (`vi.mock("...", () => ...)`) are prohibited. Every
manual module mock lives in an adjacent `__mocks__` directory instead, so the mock is
discoverable and reusable rather than re-declared per test file.

## Call-site signature tracing

Do not assume a caller passes parameters correctly just because a function's own
signature is valid or its unit tests pass in isolation. For every function or helper
touched in a change, trace every invocation site across the diff *and* the rest of the
codebase, and verify the caller's arguments actually match the updated signature.
Unit tests frequently call a function directly with hand-built parameters — that proves
the function works when called correctly, not that the production entrypoint (a runner,
an event handler, a route) actually calls it that way.

## No spaghetti conditionals

Reject ad-hoc `if` statements, scattered special cases, or edge-case flags dropped into
an otherwise linear execution path. Encapsulate variant behaviour into a dedicated
helper, state machine, or policy object instead of branching further at the call site.

## File size guard

No file grows past 1,000 lines without extracting subcomponents or helper modules. Keep
FSD slices (`src/_pages/<slice-name>/`) modular and focused rather than letting one file
absorb everything a slice needs.
