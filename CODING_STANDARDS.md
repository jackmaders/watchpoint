# Coding Standards

This document defines the repository's coding standards and design heuristics, enforced during `/implement`, `/tdd`, and `/code-review`.

For full layer definitions, slice boundaries, and FSD variations, consult [`docs/architecture.md`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/docs/architecture.md). Deep-module vocabulary is defined in [`codebase-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/codebase-design/SKILL.md); testing rules are in [`tdd`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/tdd/SKILL.md).

---

## 1. Architectural Alignment

- **Features-First Placement:** Reusable domain logic and user interactions begin immediately in `entities/` or `features/`, not deferred in `pages/`. Naming convention: `{noun}-{verb}` for features (user actions), `{noun}` for entities (domain models), and `{noun}-{purpose}` for widgets (composite read UI).
- **Deep Modules with Substantial Implementation:** Design modules that encapsulate meaningful complexity behind a clean, cohesive interface. Keep related policy and execution together unless responsibilities truly vary independently across multiple consumers.
- **Translate at the Border:** Third-party vendor payloads, external schemas, and untyped I/O must be parsed into validated domain types at the adapter boundary. Never leak external vendor schemas into core domain interfaces.
- **Insulate Volatile Dependencies Only:** Stable, type-safe ecosystem libraries (e.g. Drizzle, Zod, TanStack Router) should be used directly. Wrap only volatile, proprietary, or un-typed external SDKs (e.g. Stripe, third-party payment gateways, analytics).

---

## 2. Data Modeling & Boundaries

- **Prefer Inferred & Computed Types:** Derive types directly from the single source of truth rather than recreating manual type definitions. For example, database row and insert types must be inferred from the Drizzle schema (`typeof table.$inferSelect` / `$inferInsert`), and API types should be inferred from Zod schemas (`z.infer<typeof schema>`).
- **Parse at the Boundary, Keep Data Immutable:** Validate data strictly upon ingress. In core business logic, prefer plain, immutable, serializable data objects (POJOs / interfaces) and pure transformation functions over heavy stateful OOP class hierarchies.
- **Feature Envy:** When a calculation or transformation depends exclusively on fields from a single domain shape, colocating that function with the domain model's module is preferred.
- **Public Seam as a Change Contract:** A slice's public index (`index.ts`) promises stability to callers; anything internal to the slice reserves the freedom to be refactored without breaking external dependents.

---

## 3. Functions & Composition

- **Command-Query Separation (CQS):** A function should either perform an action or answer a query. Queries must never produce observable side effects.
- **Split Functions by State Sharing, Not Line Count:** When decomposing long functions, do not cut by arbitrary line counts. Identify clusters of logic that share the same variables/state and extract those clusters into cohesive helper functions or modules.
- **Exhaustive Pattern Matching:** Prefer TypeScript discriminated unions and `switch` statements with an exhaustive `never` check over complex class-based Strategy patterns for closed variant sets.
- **Options Objects for Parameter Scalability:** Prefer 0–2 positional arguments. When a function requires 3+ parameters, group them into a single, typed options object to enable named arguments and explicit defaults.
- **File Structure & Readability:** Place public, high-level entry points at the top of the file and private implementation helpers lower down, using standard function hoisting where appropriate.

---

## 4. Error & Null Handling

- **Exceptions for Unexpected Breakages Only:** Only throw exceptions when something unexpectedly breaks (e.g. database unreachable, network crash, unrecoverable system invariants). Routine conditions that callers are expected to handle should return values rather than throwing unhandled exceptions.
- **Narrow Nullability Early & Pass True Shapes:** Pass around the true shape of an object as much as possible. If accepting a nullable input, perform the defensive check as soon as possible at the start of the function and pass the verified non-nullable value downstream. Downstream code should not be littered with redundant defensive checks for data that has already been validated.

---

## 5. Testing Standards

- **Targeted & Implementation Testing:** Testing through public seams is standard, but testing internal implementation functions and modules directly is encouraged whenever it simplifies test setup, targets complex algorithms, or avoids brittle mocking.
- **One Test, One Contract:** Each test verifies a single specification, scenario, or invariant. Avoid asserting unrelated scenarios in a single test, but related assertions verifying the same outcome are encouraged.
- **Triple-A Structure (Arrange, Act, Assert):** Build the world, execute the action, verify the result. Keep all three phases clean, visible, and free of extraneous fixture setup.
- **Hold Tests to Production Standards:** Poorly structured test code degrades maintainability. Treat test helpers and test data factories with first-class engineering discipline.
- **No Speculative Code:** Write only the minimal production code necessary to satisfy failing tests (Red → Green → Refactor).

---

## 6. Naming & Documentation

- **Name for Intent, One Level Above Implementation:** Name functions after _why_ the caller invokes them, not _what_ lines of code execute inside them.
- **The Neighbor Rule:** Variable name length grows with scope; function name length shrinks with scope. Global functions use concise domain verbs; private helpers require descriptive names to distinguish themselves from sibling helpers.
- **Split Distinct Concerns:** Group cohesive operations that belong to the same concern together (e.g. setting and reading a cache belongs in the same module). Split when distinct architectural concerns intersect (e.g. managing a cache vs. handling database persistence).
- **Explain Non-Obvious Intent, Not Obvious Code:** Self-explanatory code needs no inline comments. Use comments strictly to document non-obvious rationale, subtle edge cases, or warnings about hidden traps.
- **Short, Concise JSDoc:** Where public functions or complex types benefit from documentation, write short, concise one-line JSDoc summaries rather than verbose multi-paragraph docstrings.
- **No Structural Apologies:** Do not write comments to explain convoluted code—refactor the code. Leave changelogs and author attributions to git.
