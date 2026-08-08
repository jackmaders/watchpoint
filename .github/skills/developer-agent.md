---
name: developer-agent
description: Developer AI Agent for building ticket vertical slices using strict TDD, Arrange-Act-Assert testing, and Feature-Sliced Design (Pages-First).
---

# Developer AI Agent Skill

You are an expert full-stack developer AI agent building high-quality software in a Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, and Cloudflare D1 / Drizzle ORM stack.

---

## 1. Primary Workflow: `implement`

Implement the work described in the developer ticket slice end-to-end.

* Drive TDD at agreed public seams.
* Write tests organized strictly into **Arrange, Act, Assert (AAA)** blocks.
* Run typechecking (`bun run check:types`), linting (`bun run check:all`), architecture checks (`bun run check:architecture`), and test coverage (`bun run test:coverage`).
* Ensure code and tests pass all checks before creating a pull request.

---

## 2. Inner Loop: `tdd` & Arrange, Act, Assert (AAA)

### Rules of the TDD Loop

1. **Red (Test First):** Write a failing unit test first. Assert expected behavior before implementing functional logic.
2. **Green (Minimal Code):** Write only enough code to make the test pass. Don't add speculative features.
3. **Refactor & Coverage:** Clean up code, ensure execution per test block is under 50ms, and maintain 100% coverage threshold (`bun run test:coverage`).

### Arrange, Act, Assert (AAA) Rule

**EVERY test MUST be explicitly organized into three distinct comments/phases: Arrange, Act, Assert.**

* **Arrange:** Set up test data, fixtures, or inputs.
* **Act:** Execute the public interface or function under test.
* **Assert:** Verify the outcome against independent, known-good expected values.

---

## 3. Good and Bad Tests & Red Flags

### Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior through public interface with AAA
test("user can checkout with valid cart", async () => {
  // Arrange
  const cart = createCart();
  cart.add(product);

  // Act
  const result = await checkout(cart, paymentMethod);

  // Assert
  expect(result.status).toBe("confirmed");
});

// GOOD: Verifies through public interface
test("createUser makes user retrievable", async () => {
  // Arrange
  const userData = { name: "Alice" };

  // Act
  const user = await createUser(userData);
  const retrieved = await getUser(user.id);

  // Assert
  expect(retrieved.name).toBe("Alice");
});

// GOOD: Independent expected literal value (not recomputed tautologically)
test("calculateTotal sums line items", () => {
  // Arrange
  const items = [{ price: 10 }, { price: 5 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(15);
});
```

**Characteristics of Good Tests:**
* Tests behavior users/callers care about
* Uses public API only
* Survives internal refactors
* Describes WHAT, not HOW
* One logical assertion per test

### Bad Tests & Red Flags

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details and mocks internal collaborators
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});

// BAD: Bypasses public interface to verify internal DB details directly
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

```typescript
// BAD: Expected value is recomputed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});
```

**Red Flags to Avoid:**
* 🚩 Mocking internal collaborators instead of testing through public seams
* 🚩 Testing private methods or internal state variables
* 🚩 Asserting on exact internal function call counts or call order
* 🚩 Test breaks during refactoring when observable behavior has not changed
* 🚩 Test name describes HOW it works instead of WHAT it accomplishes
* 🚩 Verifying outcomes through raw DB queries or private internals instead of the public interface
* 🚩 Recomputing expected test values using the same formula/logic as the implementation

---

## 4. Mandatory Git Workflow & Version Control Rules

EVERY AI agent developer iteration MUST strictly follow this 3-step Git workflow:

1. **Branch Creation at Start:**
   - Before editing any codebase files, create and checkout a clean git branch:
     ```bash
     git checkout -b dev/issue-<number>-<slice>-<clean-title>
     ```
2. **Commit & Push After Every Green Phase in TDD:**
   - As soon as a unit test turns **Green** (passing) and validation passes, immediately stage, commit, and push the progress to remote:
     ```bash
     git add -A
     git commit -m "feat(<scope>): 🔑 <description>"
     git push origin dev/issue-<number>-<slice>-<clean-title>
     ```
   - **Never hoard uncommitted changes across multiple TDD cycles.** Commit and push every passing test phase.
3. **Pull Request Creation Upon Completion:**
   - Select the appropriate PR template based on the change type:
     - 🚀 **Feature:** `.github/PULL_REQUEST_TEMPLATE/feature.md` (for new slices, capabilities, or user flows)
     - 🏗️ **Refactor:** `.github/PULL_REQUEST_TEMPLATE/refactor.md` (for structural cleanups, FSD extraction, or dependency updates with zero behavior change)
     - 🐛 **Bugfix:** `.github/PULL_REQUEST_TEMPLATE/bugfix.md` (for defect fixes or RCA remediations)
   - Once all ticket acceptance criteria are satisfied and `bun run validate` passes clean, open a Pull Request populated with the selected template schema linking to the originating issue:
     ```bash
     gh pr create --title "<type>(<scope>): <emoji> <title>" --template "<template-name>.md"
     ```

---

## 5. Architecture & System Rules

### Feature-Sliced Design (Pages-First)
* Keep UI components, business logic, and server actions inside the relevant `src/_pages/<slice-name>/` directory by default.
* Next.js routing directory (`app/`) files MUST be simple barrel re-exports (e.g. `export { HomePage as default } from "@/_pages/home"`). Route files MUST NOT contain inline business logic or UI rendering.
* Verify architecture compliance using `bun run check:architecture`.

### Automocking Protection Lock
* `plugins/enforce-automocking.grit` is locked.
* Inline manual mock factory overrides `vi.mock("...", () => ...)` are strictly prohibited.
* All manual module mocks MUST utilize adjacent `__mocks__` directories.

---

## 6. Verification Commands

Before completing work and submitting PRs, run and verify project correctness:

```bash
bun run validate
```


