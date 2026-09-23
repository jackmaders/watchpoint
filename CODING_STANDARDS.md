# Coding Standards

This document defines the repository's coding standards and design heuristics, enforced during `/implement`, `/tdd`, and `/code-review`.

For full layer definitions, slice boundaries, and FSD variations, consult [`docs/architecture.md`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/docs/architecture.md). Deep-module vocabulary is defined in [`codebase-design`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/codebase-design/SKILL.md); testing rules are in [`tdd`](file:///home/jackw/.herdr/worktrees/watchpoint/worktree-green-meadow-516b/.agents/skills/tdd/SKILL.md).

---

## 1. Architectural Alignment

- **Features-First Placement:** Reusable domain logic and user interactions begin immediately in `entities/` or `features/`, not deferred in `pages/`. Naming convention: `{noun}-{verb}` for features (user actions), `{noun}` for entities (domain models), and `{noun}-{purpose}` for widgets (composite read UI).
- **Declare Workflow or Do the Work (Never Both):** A module either orchestrates high-level policy steps or executes low-level details. If calculation logic or third-party calls sit inside workflow coordination, move the detail into a focused collaborator.
- **Translate at the Border:** Third-party schemas, external payloads, and database drivers must be translated into domain types at the adapter boundary. Never leak raw vendor types into core domain interfaces.
- **Wrap Third-Party Libraries & Exceptions:** Insulate domain code from external library churn by wrapping SDK calls and foreign errors behind internal interfaces.

---

## 2. Object Design & Boundaries

- **Law of Demeter (Tell, Don't Ask):** Avoid navigating object graphs (`a.b().c().d()`). Expose behavior on the immediate object rather than exposing raw internal state.
- **Expose Behavior, Not Data:** Prefer methods that perform domain actions over classes that act as dumb data bags with public getters and setters.
- **Feature Envy:** When a method depends primarily on another object's fields, move the method onto that object.
- **Private as a Change Contract:** `public` promises stability to callers; `private` reserves the right to refactor internals without breaking dependents.

---

## 3. Functions & Composition

- **Command-Query Separation (CQS):** A function must either _do_ something (mutate state, trigger action) or _answer_ something (return data), never both. Queries must remain side-effect free.
- **Split Functions by State Sharing, Not Line Count:** When decomposing long functions, do not cut by arbitrary line counts. Identify clusters of logic that share the same variables/state and extract those clusters into dedicated classes or modules.
- **Step-Down Rule:** Structure files like a newspaper headline: highest-level caller functions at the top; private helper implementations live directly beneath the functions that call them.
- **Bury the Switch:** Avoid scattered `switch` or `if/else` ladders across the codebase. Encapsulate polymorphic branches inside factories or strategy handlers.
- **Keep Parameters Low (0–2 preferred):** If 3+ arguments travel together or derive from the same entity, pass the parent entity or group them into a cohesive domain type.

---

## 4. Error & Null Handling

- **Exceptions Over Error Codes:** Let the algorithm express its primary intent without polluting every call site with status-code checks.
- **Never Return Null:** Return Null Objects, empty collections, or explicit Result types. Do not force callers to write defensive `if (x != null)` guards.
- **Never Use Catch as Control Flow:** `try/catch` is reserved for exceptional, unrecoverable failures, never as a substitute for standard conditional logic.

---

## 5. Testing Standards

- **Test Through Public Seams:** Verify behavior through public module interfaces, never private methods or hidden internal state.
- **One Test, One Promise:** Each test should verify a single promise/behavior. If a test fails, the name alone should tell you which contract broke.
- **Triple-A Structure (Arrange, Act, Assert):** Build the world, execute the action, verify the result. Keep all three phases clean, visible, and free of extraneous clutter.
- **Hold Tests to Production Standards:** Poorly structured, duplicate test code degrades maintainability. Treat test helpers and test data builders with first-class engineering discipline.
- **No Speculative Code:** Write only the code required to satisfy the failing test (Red → Green → Refactor).

---

## 6. Naming & Documentation

- **Name for Intent, One Level Above Implementation:** Name functions after _why_ the caller invokes them, not _what_ code executes inside them.
- **The Neighbor Rule:** Variable name length grows with scope; function name length shrinks with scope. Global functions use concise domain verbs; private helpers require descriptive names to distinguish themselves from sibling helpers.
- **The "And" Test for Classes:** If describing what a class does requires the word "and", it has multiple responsibilities. Split the class right where the "and" sits.
- **Why, Not How:** Code shows _how_; comments explain _why_ or warn about non-obvious traps.
- **No Structural Apologies:** Do not write comments to explain convoluted code—refactor the code. Leave changelogs and author attributions to git.
