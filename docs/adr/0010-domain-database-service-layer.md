# ADR-0010: Layered Domain Database Service Architecture

**Status**: Accepted  
**Date**: 2026-08-26  
**Deciders**: Engineering Team  

---

## Context

As the platform expanded across VOD authoring, admin content catalogs, audit inspection, and user history tracking, database access patterns diverged across several architectural styles:
- Direct, unmanaged ORM operations leaking into entity APIs (e.g. `src/entities/vod/api/record-attempt.ts`).
- Inconsistent file naming and organization between `repository.ts` and `service.ts` across domains.
- Varying return contracts between raw data/null values, plain arrays without total counts, and `DbResult<T>` wrappers.
- Query safety defects in dynamic queries, including unescaped `LIKE` wildcards (`%`, `_`), missing primary-key sort tiebreakers in offset pagination, and in-memory post-filtering over unpaginated relational reads.

The service layer requires a standardized, type-safe architecture that encapsulates Drizzle and Cloudflare D1 internals, enforces boundary safety, supports predictable unit test mocking, and presents intention-revealing domain interfaces to callers.

---

## Decision

We adopt **Named Domain Methods with Factored Internal Conditions** structured under a clean **Layered Database Architecture**:

### 1. Layered Directory Organization
Restructure `src/shared/db/` into three explicit layers:
- **`src/shared/db/core/`**: Foundational primitives and infrastructure:
  - `client.ts`: D1 connection resolution and `DbContext` types.
  - `errors.ts`: SQLite/D1 error classification and `D1DatabaseError`.
  - `result.ts`: `DbResult<T>`, `dbSuccess`, and `dbFailure` helpers.
  - `query.ts`: Shared query sanitization (`escapeLike`), pagination clamping, and sort tiebreaker helpers.
  - `types.ts`: Common primitive and JSON value types.
- **`src/shared/db/schema/`**: Drizzle table definitions, relations, and enums (`audit.ts`, `auth.ts`, `playthroughs.ts`, `vods.ts`, `index.ts`).
- **`src/shared/db/services/`**: Domain services exporting cohesive service objects (`vods.service.ts`, `auth.service.ts`, `audit.service.ts`, `playthroughs.service.ts`).

### 2. Service Object Contracts & Method Signatures
- Each domain exports a cohesive service object (e.g. `vodService`, `authService`, `auditService`, `playthroughService`) containing standard CRUD and named domain workflow methods.
- Methods accept strongly-typed plain options DTOs and an optional `context?: DbContext`.
- All service methods return `Promise<DbResult<T>>` (`{ success: true, data: T } | { success: false, error: string }`).

### 3. Pagination & Deterministic Sorting Standard
- Paginated collection queries standardize on `PaginatedResult<T>`:
  ```ts
  export interface PaginatedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }
  ```
- Page sizes are clamped to `[1, 50]` by default (defaulting to 10).
- All offset-paginated queries append the table's primary key (`desc(table.id)`) as a deterministic sort tiebreaker to prevent row duplication and skipping.

### 4. Query Sanitization & Boundary Invariants
- String search filters use `escapeLike(query)` from `core/query.ts` to escape `%`, `_`, and `\` before constructing SQL `LIKE` clauses.
- Security and visibility invariants (such as `isPublished = true` for player catalogs, and `userId` ownership checks for playthroughs) are hardcoded inside private condition helpers and cannot be bypassed or omitted by callers.
- No Drizzle ORM functions or query builder operators (`eq`, `and`, `like`, `db.query`) may be imported outside `src/shared/db/`.

### 5. Mocking & Test Isolation
- `src/shared/db/__mocks__/index.ts` exports mock service objects (`mockVodService`, `mockAuthService`, etc.) whose methods are `vi.fn()` instances returning `dbSuccess(...)`.
- Consumer tests assert on high-level domain calls without inspecting SQL expressions or query builders.

---

## Consequences

- **Encapsulated Data Layer**: D1 and Drizzle details remain strictly private to `src/shared/db/`.
- **Caller Ergonomics**: Callers import cohesive service objects with full TypeScript autocompletion and typed DTOs.
- **Predictable Safety**: LIKE wildcards are sanitized, pagination is bounded and deterministic, and ownership scopes are enforced.
- **Mock Stability**: Test suites mock service objects cleanly without `as unknown as` type casts.
