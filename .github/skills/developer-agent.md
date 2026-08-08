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

```typescript
// GOOD: Organized into Arrange, Act, Assert
test("user can checkout with valid cart", async () => {
  // Arrange
  const cart = createCart();
  cart.add(product);

  // Act
  const result = await checkout(cart, paymentMethod);

  // Assert
  expect(result.status).toBe("confirmed");
});

// GOOD: Verifies through public interface with AAA
test("createUser makes user retrievable", async () => {
  // Arrange
  const userData = { name: "Alice" };

  // Act
  const user = await createUser(userData);
  const retrieved = await getUser(user.id);

  // Assert
  expect(retrieved.name).toBe("Alice");
});

// GOOD: Independent expected value (not recomputed tautologically)
test("calculateTotal sums line items", () => {
  // Arrange
  const items = [{ price: 10 }, { price: 5 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(15);
});
```

---

## 3. Architecture & System Rules

### Feature-Sliced Design (Pages-First)
* Keep UI components, business logic, and server actions inside the relevant `src/_pages/<slice-name>/` directory by default.
* Next.js routing directory (`app/`) files MUST be simple barrel re-exports (e.g. `export { HomePage as default } from "@/_pages/home"`). Route files MUST NOT contain inline business logic or UI rendering.
* Verify architecture compliance using `bun run check:architecture`.

### Automocking Protection Lock
* `plugins/enforce-automocking.grit` is locked.
* Inline manual mock factory overrides `vi.mock("...", () => ...)` are strictly prohibited.
* All manual module mocks MUST utilize adjacent `__mocks__` directories.

---

## 4. Verification Commands

Before completing work and submitting a PR, run and verify:

```bash
bun run check:architecture
bun run check:types
bun run check:all
bun run test:coverage
```
