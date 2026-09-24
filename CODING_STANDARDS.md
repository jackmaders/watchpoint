# Coding Standards

This document defines the repository's coding standards and design heuristics, enforced during `/implement`, `/tdd`, and `/code-review`.

Detailed architectural definitions live in [`docs/architecture.md`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/docs/architecture.md). Deep-module vocabulary is defined in [`codebase-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/codebase-design/SKILL.md); testing rules are in [`tdd`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/tdd/SKILL.md).

---

## 1. Architectural Alignment

- **Features-First Placement:** Reusable domain logic and user interactions begin immediately in `entities/` or `features/`, not deferred in `pages/`. Naming convention: `{noun}-{verb}` for features (user actions), `{noun}` for entities (domain models), and `{noun}-{purpose}` for widgets (composite read UI).
- **Deep Modules with Substantial Implementation:** Design modules that encapsulate meaningful complexity behind a clean, cohesive interface. Keep policy orchestration and step execution together unless they change for different reasons or serve distinct consumers.
- **Translate at the Border:** Third-party vendor payloads, external schemas, and untyped I/O must be parsed into validated domain types at the adapter boundary. Never leak external vendor schemas into core domain interfaces.
- **Insulate Volatile Dependencies Only:** Stable, type-safe ecosystem libraries (e.g. Drizzle, Zod, TanStack Router) should be used directly. Wrap only volatile, proprietary, or un-typed external SDKs (e.g. Stripe, third-party payment gateways, analytics).

---

## 2. Data Modeling & Boundaries

- **Prefer Inferred & Computed Types:** Derive types directly from the single source of truth rather than recreating manual type definitions. For example, database row and insert types must be inferred from the Drizzle schema (`typeof table.$inferSelect` / `$inferInsert`), and API types should be inferred from Zod schemas (`z.infer<typeof schema>`).
- **Parse at the Boundary, Keep Data Immutable:** Validate data strictly upon ingress. In core business logic, prefer plain, immutable, serializable data objects (POJOs / interfaces) and pure transformation functions over heavy stateful OOP class hierarchies.
- **Feature Envy:** When a calculation or transformation depends exclusively on fields from a single domain shape, colocating that function with the domain model's module is preferred.
- **Public Seam as a Change Contract:** A slice's public index (`index.ts`) promises stability to callers; anything internal to the slice reserves the freedom to be refactored without breaking external dependents.
- **Lazy & Async Slice Entrypoints:** Slices providing code-split components offer a dual entrypoint: `index.ts` for synchronous exports and `index.async.ts` for code-split, self-suspending exports. Internal lazy wrappers use `.async.tsx` (e.g. `ui/<component>.async.tsx`) to avoid conflicts with TanStack Router's `.lazy.tsx` route files. Never mix static and dynamic imports of the same component in one barrel.

---

## 3. Functions & Composition

- **Command-Query Separation (CQS):** A function should either perform an action or answer a query. Queries must never produce observable side effects. Database mutations (such as inserts or updates) may return the created or updated record.
- **Split Functions by State Sharing, Not Line Count:** When decomposing long functions, do not cut by arbitrary line counts. Identify clusters of logic that share the same variables/state and extract those clusters into cohesive helper functions or modules.
- **Exhaustive Pattern Matching:** Prefer TypeScript discriminated unions and `switch` statements with an exhaustive `never` check over complex class-based Strategy patterns for closed variant sets.
- **Options Objects for Parameter Scalability:** Prefer 0–2 positional arguments. When a function requires 3+ parameters, group them into a single, typed options object to enable named arguments and explicit defaults.
- **File Structure & Readability:** Place public, high-level entry points at the top of the file and private implementation helpers lower down, using standard function hoisting where appropriate.

---

## 4. Error & Null Handling

- **Exceptions for Unexpected Breakages Only:** Throwing is reserved for unrecoverable errors and external library control-flow primitives that require it by design (e.g. router redirects). Business logic functions should return values.
- **Pass True Shapes:** Pass around the true, complete shape of an object through domain operations, business pipelines, and orchestrator components rather than fragmenting it into piecemeal fields. Leaf components represent the exception: their prop interfaces define only the specific subset needed for presentation, while permitting callers to spread true shapes directly on them.
- **Narrow Nullability Early:** When a function accepts nullable input, validate or narrow it immediately at entry so downstream code receives the verified non-nullable value without redundant fallback checks.

---

## 5. Testing Standards

- **One Test, One Contract:** Each test verifies a single specification, scenario, or invariant. Name tests using clear specification-style descriptions stating the subject, condition, and expected outcome. Avoid asserting unrelated scenarios in a single test, but related assertions verifying the same outcome are encouraged.
- **Triple-A Structure (Arrange, Act, Assert):** Build the world, execute the action, verify the result. Keep all three phases clean, visible, and free of extraneous fixture setup.
- **Hold Tests to Production Standards:** Poorly structured test code degrades maintainability. Treat test helpers and test data factories with first-class engineering discipline.
- **No Speculative Code:** Write only the minimal production code necessary to satisfy failing tests (Red → Green → Refactor).

---

## 6. Naming & Documentation

- **Name for Intent, One Level Above Implementation:** Name functions after _why_ the caller invokes them, not _what_ lines of code execute inside them.
- **The Neighbor Rule:** Variable name length grows with scope; function name length shrinks with scope. Global functions use concise domain verbs; private helpers require descriptive names to distinguish themselves from sibling helpers.
- **Split Distinct Concerns:** Group cohesive operations that belong to the same concern together (e.g. setting and reading a cache belongs in the same module). Split when distinct architectural concerns intersect (e.g. managing a cache vs. handling database persistence).
- **Explain Non-Obvious Intent, Not Obvious Code:** Self-explanatory code needs no inline comments. Use comments strictly to document non-obvious rationale, subtle edge cases, or warnings about hidden traps.
- **Short, Concise JSDoc:** Where public functions or complex types benefit from documentation, write concise JSDoc summaries rather than verbose multi-paragraph docstrings.
- **No Structural Apologies:** Do not write comments to explain convoluted code—refactor the code. Leave changelogs and author attributions to git.

---

## 7. Tech Conventions

- **Routing & Search Params:** Prefer TanStack Router search params for shareable, bookmarkable page state over local component state.
- **Server State over Effects:** Rely on TanStack Query for remote state. Never mirror query state into `useState` via `useEffect`.
- **Render-Phase Derivation:** Compute derived state inline during render; avoid effect-driven state cascades.
- **Direct Schema Usage & Server Function Boundaries:** Use Drizzle ORM directly without creating synthetic DAO wrappers. Database access and queries must live inside server modules or dedicated server functions.
