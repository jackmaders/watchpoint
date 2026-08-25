# Coding Standards

This is the file `code-review`'s Standards axis reads. It is the surviving content of the
Developer and Reviewer agent skills deleted in #50 — the parts that describe how code
*should* be written, independent of any specific ticket's requirements. The Spec axis
(does this PR do what the issue asked?) is judged against the issue, not this file.

## Feature-Sliced Design (Pages-First)

- Keep UI components, business logic, and server actions inside the relevant
  `src/pages/<slice-name>/` directory by default.
- Do not extract logic into `features/` or `widgets/` until a second consumer explicitly
  requires it.
- Cross-slice imports go through a slice's public API (`index.ts`) only.
- `bun run check:architecture` (Steiger) enforces this — treat a failure as a real
  violation, not a linter to silence.

## Feature naming — action-first

Features extracted into `src/features/` are named `{action}-{entity}` (verb-noun): `create-user`,
`submit-feedback`. A feature's name describes what it does, not just what it's about.

## Routing directory (`app/routes/`) — ultra-thin adapters

Every route file under `app/routes/` MUST be an ultra-thin parameter-binding and composition adapter:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { HomePage, loadHomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	component: HomeRoute,
	loader: loadHomePage,
});

function HomeRoute() {
	const { vods } = Route.useLoaderData();
	return <HomePage vods={vods} />;
}
```

- **Zero Inline Logic**: No state hooks (`useState`, `useEffect`, `useReducer`, `useMemo`), inline business logic, DOM manipulation, or raw HTML tags.
- **Delegation**: Loaders, beforeLoad auth checks, search param validators, request handlers, and route presentations MUST be delegated to dedicated functions in `src/pages/<slice-name>/` or `src/shared/`.
- **Enforcement**: `plugins/enforce-ultra-thin-routes.grit` enforces this rule via Biome linting.


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

Three Grit plugins are structural locks on this repo's architectural and testing discipline and MUST NOT be
edited, weakened, or extended with bypass exceptions:

- `plugins/enforce-automocking.grit` — see "Manual mocks" below.
- `plugins/enforce-aaa-assertions.grit` — see "Test structure" above.
- `plugins/enforce-ultra-thin-routes.grit` — see "Routing directory" above.


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
FSD slices (`src/pages/<slice-name>/`) modular and focused rather than letting one file
absorb everything a slice needs.

## Database Services & D1 Error Handling Standards

### Service-Oriented Architecture
- Database modules under `src/shared/db/<domain>/` are structured as **Domain Services** (`service.ts`).
- Drizzle acts as the internal data-mapping engine. All database access must flow through typed domain service functions.
- Services export standard CRUD operations and named domain workflow functions.

### Method Naming & Return Type Contracts
- **Single Record Queries**: Use `get<Entity>ById(id)` or `get<Entity>By<Field>(value)`. Always returns `Promise<T | null>` (never throws on not-found).
- **Collection Queries**: Use `list<Entities>(options)`. Always returns `Promise<T[]>` (returns empty array `[]` when no matches are found).
- **Existence & Metrics**: Use `exists<Entity>(options)` (`Promise<boolean>`) and `count<Entities>(options)` (`Promise<number>`).
- **Standard Mutations**:
  - `create<Entity>(input)`: Inserts a single record. Returns `Promise<T>`.
  - `update<Entity>(id, input)`: Updates a single record. Returns `Promise<T | null>`.
  - `upsert<Entity>(input)`: Inserts or updates a record based on unique constraints. Returns `Promise<T>`.
  - `delete<Entity>(id)`: Deletes a single record. Returns `Promise<boolean>`.
- **Complex Domain Workflows**: Named with action-first business verbs (`publishVod`, `reorderScenarios`, `changeUserRole`, `recordPlaythroughAttempt`, `completePlaythrough`).

### D1Error & SQLite Error Handling
- Catch raw Drizzle / D1 exceptions and map or verify against standard `D1ErrorCode` constants / SQLite error codes (e.g. `SQLITE_CONSTRAINT_UNIQUE = 2067`, `SQLITE_CONSTRAINT_FOREIGNKEY = 787`, `SQLITE_BUSY = 5`).
- Query operations return `null` or `[]` on missing records and only propagate genuine D1 infrastructure errors.
- Mutation operations catch constraint violations to distinguish predictable conflicts (e.g. unique constraint collision) from fatal infrastructure failures.
- Server-side error monitoring (Sentry) and client-side UI error notifications (Toasts) are isolated at server function (`server-fns.ts`) and client mutation boundaries (`MutationCache` / `QueryCache`).

