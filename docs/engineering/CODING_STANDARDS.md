# Coding standards

Applies when naming server or client modules, exports, functions, variables, or
SQL columns, changing database schemas, input validation schemas, database
operations, component props, error handling, or object and data design, or
writing comments or suppression comments, or applying function-level design conventions.

## Code organization

- Place entry points before their implementation helpers so readers see the
  workflow before its details.
- When adjacent blocks express different concepts, separate them with blank
  lines.
- Declare local variables near their first use, inside the smallest block that
  needs them.

## Naming

### Functions and variables

- Name functions for their purpose or result.
- Name values for what they represent where they are used, and match names to
  their actual shape or behavior.
- Name related functions so callers can distinguish their behavior without
  reading their implementations.
- Use readable words and familiar abbreviations.
- Use named constants for numbers with business meaning, and descriptive,
  searchable names for domain values.
- Avoid prefixes that only repeat the declared type; name values for their
  domain meaning and role.
- Give widely used variables descriptive names. Give related private
  helpers names that distinguish their specific operations.
- Use descriptive identifiers with 2 or more characters for all variables and
  generics (`TValue` instead of `T`), satisfying `eslint(id-length)`.

### Server and client modules

- When a module defines server functions, name it `<name>.functions.ts`.
- When a file directly imports an external server-only runtime dependency,
  name it `<name>.server.ts`.
- When a file directly imports an external client-only runtime dependency,
  name it `<name>.client.ts`.
- Keep ordinary filenames for files that only import local server or client
  modules.
- When a slice needs separate barrel files for server and client exports,
  use `index.server.ts` and `index.client.ts`.
- Only export from the slice root (`index.ts` or `index.{client,server}.ts`).
  Do not create internal segment barrel files (`api/index.ts`, `ui/index.ts`,
  `model/index.ts`); import directly from segment files within the slice.
- When an export is created with `createServerFn`, suffix its name with `Fn`.

### Route and page components

- Name screen components in `src/pages` `<Name>Page`, including placeholder screens.
- When a route file needs a React wrapper to read route state or wire props,
  name it `<Name>Route` and delegate presentation to a Page.
- Bind TanStack route definitions to `Route` and export that definition.
  A route may reference an imported Page directly when no wrapper is needed.
- Keep layout components named `<Name>Layout`.

### Framework conventions

- When a framework requires a particular name, use that name.

## Function design

- When positional arguments are hard to understand or allow invalid
  combinations, use a named parameter object.
- Replace boolean mode arguments with separate operations or named options so
  the call site shows the behavior.
- Make side effects clear in the function name or contract. Keep checks
  separate from unrelated state changes.
- Name predicates so callers can understand what `true` and `false` mean.
- When multiple functions repeat dispatch on the same type, centralize that
  dispatch so adding a variant does not require updating each function.
- Decompose complex form views into focused sub-components to keep all
  functions under the 50-line ESLint limit (`max-lines-per-function`).

## Comments

- Keep comments accurate as the code changes.
- Explain business constraints, non-obvious behavior, or risks when maintainers
  need that context to use or change the code safely.
- Document public API behavior, inputs, outputs, and side effects.
- Do not add comments that narrate why a change was made, who requested it, or
  what feedback it addresses; keep that history in the conversation or commit.
- Remove comments that only restate the code. Prefer clear names and helpers
  that explain mechanics.
- Delete commented-out code; version history retains it.
- Write TODOs with an action and the condition for resolving them.

## Knip export tags

- **Top-level export only**: Only add `@public` or `@internal` to the single top-level exported symbol that will be imported by external consumers or tests (e.g., `todosQueryOptions` or `TodosPage` in the slice barrel `src/pages/todos/index.ts`). Do not duplicate tags on underlying implementation functions, schemas, or transitive types that are already referenced by that top-level export, and do not add tags to files already configured as `entry` points in `knip.json` (such as worker entries or Vitest automocks). Knip traces transitive usages from tagged exports and configured entry points automatically.
- **`@internal`**: Must ONLY be added to exports to enable enhanced testability of internal functions/schemas, and must ONLY be added **AFTER** tests and functionality are already implemented. **DO NOT ADD `@internal` preemptively.**
- **`@public`**: Must include a specific ticket or PR reference explaining where/when the export will be consumed (or an explicit rationale such as shadcn completeness or Vitest runtime mock contract).
- **One-liner JSDoc syntax**: Use clean one-liner JSDoc comments with inline explanations (`jsdoc/empty-tags` is disabled in `vite.config.ts` to allow this):
  ```ts
  /** @public Kept for shadcn completeness. */
  /** @public Tracked in #173. */
  /** @internal Exported solely to enable enhanced testability. */
  ```
- **Direct export placement**: Place `@public` and `@internal` tags directly above the `export` statement itself (`/** @internal ... */\nexport ...`), never inside a grouped `export { ... }` block. Knip parses JSDoc tags from the start of the `export` AST node (`node.start`) and does not inspect inner specifiers inside `export { ... }`.
- **Prohibit `knip --fix`**: Never run `knip --fix` in this repository. Automatic fixing strips required runtime exports from Vitest automocks (`__mocks__`) and Cloudflare worker entry points, and mangles adjacent JSDoc comments. Manage and remove unused exports manually.

## Linter and compiler suppressions

- **Zero Unreviewed Linter Suppressions**: Treat any `oxlint-disable`, `eslint-disable`, `@ts-ignore`, or suppression comment added in a diff as an active review concern. The reviewer must verify that:
  - No standard utility, theme class, or component prop exists to satisfy the rule cleanly.
  - The suppression comment provides clear architectural rationale rather than a mechanical restatement.
  - The reviewer explicitly notes every newly introduced suppression and its justification in the PR review summary.

## Objects and data

- When getters or setters couple callers to internal storage, replace
  them with operations that preserve freedom to change the storage.
- When a requirement calls for variation, choose an extension strategy
  that supports that requirement.
- Ask collaborators for operations directly. Avoid chaining through
  returned service objects; ordinary access to plain data is fine.
- When business behavior must change independently, separate it from
  raw data so callers can use the data without depending on that behavior.

## Database

- Keep `src/shared/db/schema/` focused on Drizzle table definitions and types
  inferred directly from those tables (`$inferSelect` and `$inferInsert`). Do
  not define operation or transport validation schemas there.
- Define validation schemas for operation inputs and outputs beside their API
  operations, using `api/*-schema.ts` within the owning slice. Derive fields
  from the Drizzle table when useful, then narrow or extend the shape to match
  the operation's caller-facing contract.
- Use snake_case for SQL column names.
- When declaring a foreign key, specify its deletion behavior explicitly.
- Declare Drizzle indexes and composite unique constraints in the table
  callback. Column-level unique constraints may remain on the column.
- When an API validation schema mirrors table fields, derive it from the
  Drizzle schema in the API schema module.
- Limit client input schemas to fields the client must supply. Omit
  generated and server-owned fields from create inputs.
- When reading or writing user-owned records, scope the operation to
  the authenticated user's ID.
- If an operation expects a row but `.returning()` returns none,
  throw an error.
- The project uses Drizzle v1 implementation with Better Auth using SQL builders
  and the standard `better-auth/adapters/drizzle` adapter without relational query joins.
  If Better Auth joins are enabled in the future, align Drizzle RC relations with
  the matching relations-v2 adapter (`@better-auth/drizzle-adapter/relations-v2`)
  declared directly as a dependency at a compatible version rather than relying on a
  transitive package.

## Error handling

- Handle failures with guard clauses or separate error handling.
  Keep the success path readable as sequential steps.
- When callers need application-owned error types, translate vendor
  exceptions at the adapter boundary.
- Represent expected alternatives with conditions, domain-specific data,
  or defaults. Reserve exceptions for failures.
- When an empty value preserves the API's meaning, use it—for example,
  return an empty collection. When absence is a distinct result callers
  must handle, use `null`.
- Propagate or explicitly handle errors in custom hooks; omit silent `catch {}`
  blocks that retain stale state.

### Server operations and TanStack Query

- Return domain data directly from successful server operations. Throw
  `ApplicationError` for failures with a known application code. Let unexpected
  failures propagate to the global server-function error middleware for logging
  and normalization.
- Model expected alternatives in the operation's data contract. A lookup may
  return `null` when a record is absent; an update that requires an existing
  record fails when that record is absent.
- Let `queryFn` and `mutationFn` return successful data and propagate rejected
  server-function calls. Do not return a generic success/error `Result` envelope:
  Query treats a resolved error envelope as successful data and runs success
  handlers.
- Do not replace a failed request with `null` or an empty collection. Use those
  values for successful outcomes defined by the operation's contract. Handle
  failures at the owning Router, query, mutation, or form UI boundary.
- Use configured public error messages or a generic fallback for unknown
  failures displayed in the owning UI.

## UI component implementation hierarchy (Ponytail)

When implementing UI controls, interactions, or views, adhere to the Ponytail anti-over-engineering preference hierarchy. Stop at the first tier that satisfies the requirement:

1. **Browser-native**: Prefer built-in HTML platform capabilities and native elements (e.g. `<input type="date">`, `<input type="file">`, `<dialog>`, `<details>`, `<button>`, native form validation). Avoid third-party abstractions when a native element cleanly meets the requirement.
2. **Existing shadcn primitives**: Reuse and compose primitives and components already present in `src/shared/ui/shadcn/` (or add standard components via shadcn). Compose existing primitives (`Field`, `Card`, `ToggleGroup`, `Dialog`, `Sheet`) rather than reinventing custom controls.
3. **Dedicated package**: If native elements and shadcn primitives cannot meet the specification, evaluate an established, lightweight, focused package (e.g. `cmdk`, `react-day-picker`, `embla-carousel-react`).
4. **Custom build**: Author bespoke custom components and state machines only as a last resort when tiers 1–3 cannot meet the accepted requirements.

## Component props

- Derive component props from the underlying root element or component using
  `React.ComponentProps<"element">` (e.g. `React.ComponentProps<"div">`) or
  `React.ComponentProps<typeof WrappedComponent>`.
- Always merge caller-provided `className` with the component's default styling
  using `cn(...)` (from `@/shared/lib/cn` or `cn`).
- Spread all remaining forwarded props (`...props`) onto the root rendered
  element or component.
- When a wrapper owns custom props, exclude them from forwarded props using
  `Omit` and spread the remaining props onto the wrapped element or component.

## Testing

- Never write conditional assertions (if (...) expect(...)) or try/catch in tests; use expect(() => fn()).toThrow(...).
